'use client'
import { withSubmitLock } from '@/lib/withSubmitLock'
import { toPng } from "html-to-image"
import ReceiptPreview from "@/components/ui/ReceiptPreview"
import { useToast } from '@/hooks/use-toast'
import React, { useState, useEffect,useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Package,Loader2, Plus, Edit, Trash2, ShoppingCart, FileText, Wallet, TrendingUp, TrendingDown, Download, Calendar as CalendarIcon, Image as ImageIcon, Printer, ShoppingBag } from 'lucide-react'
import { NextResponse } from "next/server"



function parseCart(cart: string) {
  try {
    return JSON.parse(cart)
  } catch {
    return []
  }
}

// Variabel global sementara untuk data struk
declare global {
  interface Window {
    printStrukData?: any
  }
}

if (typeof window !== 'undefined') {
  window.printStrukData = undefined;
}

type RawMaterial = {
  id: string
  name: string
  unitPrice: number
  quantity: number
  unit: string
  totalPrice: number
  createdAt: string
}

type Size = {
  id: string
  size: string
  price: number
  stock: number
}

type Menu = {
  id: string
  name: string
  image: string
  createdAt: string
  sizes: Size[]
}

type Transaction = {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  date: string
  createdAt: string
  salesHeaderId?: string | null
  rawMaterialId?: string | null
}

type Sale = {
  id: string
  menuId: string
  sizeId: string
  quantity: number
  price: number
  total: number
  date: string
  createdAt: string
  menu: {
    id: string
    name: string
  }
  size: {
    id: string
    size: string
    price: number
    stock: number
  }
}

type CartItem = {
  menuId: string
  menuName: string
  sizeId: string
  sizeName: string
  price: number
  qty: number
}

type SalesHeader = {
  id: string
  buyerName: string
  totalAmount: number
  date: string
  items: Sale[]
}

// Helper function
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export default function Home() {
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shouldPrint, setShouldPrint] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [printData, setPrintData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('materials')
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [isSaving, setIsSaving] = useState(false);
  const {toast} = useToast()
  const [transactionFilter, setTransactionFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
    // State Edit Pre-Order (Baru)
  const [isEditPreOrderOpen, setIsEditPreOrderOpen] = useState(false)
  const [editingPreOrderId, setEditingPreOrderId] = useState<string | null>(null)
  const [editPreOrderCart, setEditPreOrderCart] = useState<any[]>([])
  const [editPreOrderBuyerName, setEditPreOrderBuyerName] = useState("")

  // State Form & UI
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false)
  const [editingTransactionData, setEditingTransactionData] = useState<any>(null)
  const [editCart, setEditCart] = useState<any[]>([])
  const [transactionMode, setTransactionMode] = useState<'cash' | 'preorder'>('cash')
  const [cart, setCart] = useState<CartItem[]>([])
  const [buyerName, setBuyerName] = useState("")
  
  // Handler: Klik tombol Edit di Pre-Order
  const handleEditPreOrderClick = (po: any) => {
    // 1. Ambil data menus FRESH setiap kali tombol diklik
    // Jangan pakai 'menus' dari closure luar, tapi ambil referensi terbaru
    const currentMenus = [...menus]; 

    setEditingPreOrderId(po.id)
    setEditPreOrderBuyerName(po.buyerName)
    
    // Parse cart
    const cartItems = Array.isArray(po.cart) ? po.cart : JSON.parse(po.cart)
    
    // Mapping data
    const itemsWithSizes = cartItems.map((item: any) => {
      // 2. Gunakan currentMenus untuk pencarian
      const menu = currentMenus.find((m) => String(m.id) === String(item.menuId))
      
      let finalSizes: any[] = []

      if (menu) {
        // Jika ketemu, pakai sizes terbaru
        finalSizes = menu.sizes 
      } else {
        // Jika tidak ketemu (Data lama/ID beda), buat dummy size
        finalSizes = [{
          id: item.sizeId, 
          size: item.sizeName, 
          price: item.price, 
          stock: 999 
        }]
      }

      // Debug: Lihat apakah 'finalSizes' terisi
      console.log(`Item: ${item.menuName}, SizesCount: ${finalSizes.length}, FirstSize: ${finalSizes[0]?.size}`);

      return {
        ...item,
        sizes: finalSizes
      }
    })

    setEditPreOrderCart(itemsWithSizes)
    setIsEditPreOrderOpen(true)
  }

  // Handler: Simpan Update Pre-Order
  const handleUpdatePreOrder = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const totalAmount = editPreOrderCart.reduce((sum, item) => sum + (item.price * item.qty), 0)

      const response = await fetch('/api/preorders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPreOrderId,
          buyerName: editPreOrderBuyerName,
          totalAmount: totalAmount,
          items: editPreOrderCart.map(item => ({
            menuId: item.menuId,
            sizeId: item.sizeId,
            menuName: item.menuName, // ⬅️ TAMBAHKAN INI
            sizeName: item.sizeName, // ⬅️ DAN INI
            price: item.price,
            qty: item.qty
          }))
        })
      })

      if (!response.ok) throw new Error('Gagal update pre-order')

      toast({ title: 'Berhasil', description: 'Pre-Order berhasil diperbarui' })
      setIsEditPreOrderOpen(false)
      fetchPreOrders() // Refresh data
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal menyimpan perubahan' })
    } finally {
      setIsSaving(false)
    }
  }

  // State Pre-Order
  const [savedPreOrders, setSavedPreOrders] = useState<any[]>([])

  // State Menu Form
  const [menuForm, setMenuForm] = useState({
    name: '',
    image: '',
    sizes: [{ size: '', price: '', stock: '' }]
  })
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)

  // State Bahan Baku Form
  const [rawMaterialForm, setRawMaterialForm] = useState({
    name: '',
    unitPrice: '',
    quantity: '',
    unit: ''
  })
  const [editingRawMaterial, setEditingRawMaterial] = useState<RawMaterial | null>(null)
  const [isRawMaterialDialogOpen, setIsRawMaterialDialogOpen] = useState(false)

  // State Laporan
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [reportPreview, setReportPreview] = useState<{
    transactions: Transaction[]
    sales: Sale[]
    totalIncome: number
    totalExpense: number
    totalSales: number
    dateRange: {
      startDate: string | null
      endDate: string | null
    }
  } | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // State Sell (Hilang dari copy paste kamu)
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false)
  const [selectedMenuForSell, setSelectedMenuForSell] = useState<Menu | null>(null)
  const [selectedSizeForSell, setSelectedSizeForSell] = useState<Size | null>(null)
  const [sellQuantity, setSellQuantity] = useState(1)

  // FETCH FUNCTIONS
  const fetchPreOrders = async () => {
    try {
      const response = await fetch('/api/preorders')
      const data = await response.json()
      setSavedPreOrders(data)
    } catch (error) {
      console.error('Error fetching pre-orders:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memuat pre-order',
      })
    }
  }

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials')
      const data = await response.json()
      setRawMaterials(data)
    } catch (error) {
      console.error('Error fetching raw materials:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memuat bahan baku',
      })
    }
  }

  const fetchMenus = async () => {
    try {
      const response = await fetch('/api/menus')
      const data = await response.json()
      setMenus(data)
    } catch (error) {
      console.error('Error fetching menus:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memuat menu',
      })
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions')
      const data = await response.json()
      setTransactions(data.transactions)
      setTotalIncome(data.totalIncome || 0)
      setTotalExpense(data.totalExpense || 0)
      setTotalSales(data.totalItemsSold || 0)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: 'Gagal',
        description: 'Gagal memuat transaksi',
      })
    }
  }

  // HANDLERS

  // 1. Simpan Pre-Order
  const handleSaveAsPreOrder = async () => {
    console.log("=== MULAI SAVE PRE-ORDER ===");
    console.log("1. buyerName:", buyerName);
    console.log("2. cart:", cart);
    console.log("3. cart.length:", cart.length);
    if (loading) return
    setLoading(true)
    if (!buyerName || cart.length === 0) {
      toast({
      title: 'Gagal',
      description: 'Isi nama pembeli dan pilih menu terlebih dahulu',
    })
      return
    }

    // Pastikan angka
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0)
    console.log("4. totalAmount:", totalAmount);

    try {
      const bodyPayload = JSON.stringify({ buyerName, totalAmount, items: cart })
      console.log("5. Body yang dikirim ke API:", bodyPayload);

      const response = await fetch('/api/preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyPayload
      })

      console.log("6. Response Status:", response.status);
      console.log("7. Response OK?", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("8. Response Body dari API:", result);
        toast({
          title: 'Berhasil',
          description: 'Pre-Order berhasil disimpan',
        })
        setCart([])
        setBuyerName("")
        await fetchPreOrders()
      } else {
        const err = await response.json()
        console.error("GAGAL STATUS:", err);
        toast({
          title: 'Gagal',
          description: 'Gagal menyimpan pre-order',
        })
      }
    } catch (error) {
      console.error("CATCH ERROR:", error)
      toast({
      title: 'Gagal',
      description: 'Terjadi kesalahan saat menyimpan pre-order',
    })
    } finally {
      setLoading(false)
    }
  }
  // 2. Hapus Pre-Order
  const handleDeletePreOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/preorders?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Pre-Order berhasil dihapus',
        })
        setSavedPreOrders(savedPreOrders.filter(po => po.id !== id))
      } else {
        toast({
          title: 'Gagal',
          description: 'Gagal menghapus pre-order',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
      title: 'Gagal',
      description: 'Gagal memnghapus pre-order',
    })
    }
  }

  // 3. Proses Pre-Order Jadi Tunai
  const handleProcessSavedOrder = async (order: any) => {
  if (processingOrderId) return
  setProcessingOrderId(order.id) // ⬅️ kunci hanya order ini
    try {
      // 1. Parse cart
      const itemsToSend = Array.isArray(order.cart)
        ? order.cart
        : JSON.parse(order.cart)

      // 2. Kirim ke backend
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: order.buyerName,
          totalAmount: order.totalAmount,
          items: itemsToSend,
        }),
      })

      // 3. ⛔ STOK TIDAK CUKUP → TOAST
      if (!response.ok) {
        const errorData = await response.json()
        console.log('ERROR API SALES:', errorData)
        toast({
          title: 'Stok Tidak Cukup',
          description: `Stok Menu tidak cukup untuk melakukan transaksi ini, mohon periksa kembali.`,
        })
        return
      }
      // 4. BERHASIL
      toast({
        title: 'Berhasil ✅',
        description: 'Transaksi berhasil diproses! Stok terpotong.',
      })

      // 5. Hapus pre-order
      await fetch(`/api/preorders?id=${order.id}`, { method: 'DELETE' })
      setSavedPreOrders(prev => prev.filter(po => po.id !== order.id))

      fetchMenus()
      fetchTransactions()
      
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat memproses transaksi',
        variant: 'destructive',
      })
    } finally {
    setProcessingOrderId(null) // ⬅️ buka kunci
    }
  }

  // 4. Process Tunai Biasa
  const handleProcessTransaction = async () => {
    if (loading) return // ⛔ cegah double click
    // 1. Validasi dasar
    if (!buyerName || cart.length === 0) {
      return toast({
        title: 'Gagal',
        description: 'Isi nama pembeli dan pilih menu terlebih dahulu',
      })
    }

    const totalAmount = cart.reduce(
      (sum, item) => sum + (item.price * item.qty),
      0
    )
    setLoading(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName,
          totalAmount,
          items: cart
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // 🔥 STOK KURANG DARI BACKEND
        if (result.error === 'STOCK_NOT_ENOUGH') {
          toast({
            title: 'Stok Tidak Cukup',
            description: `Menu ${result.menuName} (${result.sizeName}) hanya tersisa ${result.remainingStock} pcs.`,
          })
          return
        }

        // Error lain
        toast({
          title: 'Gagal',
          description: result.error || 'Transaksi gagal diproses',
          variant: 'destructive',
        })
        return
      }

      // ✅ BERHASIL
      toast({
        title: 'Berhasil',
        description: 'Transaksi berhasil disimpan',
      })

      setCart([])
      setBuyerName('')
      fetchMenus()
      fetchTransactions()

    } catch (err) {
      console.error(err)
      toast({
        title: 'Error',
        description: 'Gagal terhubung ke server',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 5. Print Transaction
  const [loadingPrintIds, setLoadingPrintIds] = useState<Record<string, boolean>>({});
  const [loadingEditIds, setLoadingEditIds] = useState<Record<string, boolean>>({});
  // 2. UPDATE Handler Print Transaction (Cash)
  const handlePrintTransaction = async (transaction: any) => {
    const salesHeaderId = transaction.salesHeader?.id;
    if (!salesHeaderId) {
      return toast({
        title: 'Gagal',
        description: 'ID sales header tidak ditemukan',
      });
    }

    if (loadingPrintIds[salesHeaderId]) return;

    setLoadingPrintIds(prev => ({ ...prev, [salesHeaderId]: true }));

    try {
      const res = await fetch(`/api/sales-header-detail?id=${salesHeaderId}`);
      if (!res.ok) throw new Error("Gagal ambil detail");

      const detail = await res.json();
      
      // ⬇️ TAMBAHKAN receiptType: "CASH" AGAR TAMPILAN KONSISTEN ⬇️
      const detailWithType = {
        ...detail,
        receiptType: "CASH" as const
      };

      setPrintData(detailWithType);
      setIsPrintDialogOpen(true);
    } catch (err) {
      console.error("PRINT ERROR:", err);
      toast({
        title: 'Gagal',
        description: 'Gagal ambil detail transaksi',
      });
    } finally {
      setLoadingPrintIds(prev => ({ ...prev, [salesHeaderId]: false }));
    }
  };


  const [editingSalesHeaderId, setEditingSalesHeaderId] = useState<string | null>(null)

  // 6. Edit Transaction
  const handleEditTransactionClick = async (salesHeaderId: string) => {
    if (loadingEditIds[salesHeaderId]) return; // cegah double click

    setLoadingEditIds(prev => ({ ...prev, [salesHeaderId]: true }));

    try {
      const res = await fetch(`/api/sales-header-detail?id=${salesHeaderId}`);
      if (!res.ok) throw new Error('Gagal mengambil data');

      const data = await res.json();

      setEditingSalesHeaderId(data.id);
      setBuyerName(data.buyerName);

      setEditCart(
        data.items.map((item: any) => ({
          menuId: item.menuId,
          menuName: item.menu.name,
          sizeId: item.sizeId,
          sizeName: item.size.size,
          price: item.price,
          qty: item.quantity,
          sizes: item.menu.sizes // ⬅️ penting untuk ganti size
        }))
      );

      setIsEditTransactionOpen(true);
    } catch (err) {
      toast({ title: 'Gagal', description: 'Gagal memuat transaksi' });
    } finally {
      setLoadingEditIds(prev => ({ ...prev, [salesHeaderId]: false }));
    }
  };


  // Update Transaction Handler
  const handleUpdateTransaction = async () => {
    if (isSaving) return; // mencegah double click
    setIsSaving(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesHeaderId: editingSalesHeaderId,
          buyerName,
          items: editCart
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast({ title: 'Berhasil', description: 'Transaksi diperbarui' })
      setIsEditTransactionOpen(false)
      fetchTransactions()
      fetchMenus()
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message })
    }
    finally {
      setIsSaving(false);
    }
  }

  // 7. Cart Logic
  const addToCart = (menu: Menu, size: Size) => {
    const existingItemIndex = cart.findIndex(
      (item) => item.menuId === menu.id && item.sizeId === size.id
    )

    let newQty = 1

    if (existingItemIndex > -1) {
      // ⛔ Cegah melebihi stok (opsional tapi disarankan)
      if (cart[existingItemIndex].qty >= size.stock) {
        toast({
          title: "Stok tidak mencukupi",
          description: `${menu.name} • ${size.size}`,
        })
        return
      }

      const updatedCart = [...cart]
      updatedCart[existingItemIndex].qty += 1
      newQty = updatedCart[existingItemIndex].qty
      setCart(updatedCart)
    } else {
      setCart([
        ...cart,
        {
          menuId: menu.id,
          menuName: menu.name,
          sizeId: size.id,
          sizeName: size.size,
          price: size.price,
          qty: 1,
        },
      ])
      newQty = 1
    }

    // ✅ TOAST DENGAN QTY TERKINI
    toast({
      title: "Menu berhasil ditambahkan",
      description: `${menu.name} • ${size.size} • Jumlah: ${newQty}`,
    })
  }

  const removeFromCart = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  // 8. Material Logic
  const [rawMaterialLoading, setRawMaterialLoading] = useState(false)
  const handleSubmitRawMaterial = async () => {
    if (rawMaterialLoading) return

    try {
      setRawMaterialLoading(true)

      if (editingRawMaterial) {
        await handleUpdateRawMaterial()
      } else {
        await handleAddRawMaterial()
      }

    setIsRawMaterialDialogOpen(false)
    // setEditingRawMaterial(null)
    setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
    } finally {
      setRawMaterialLoading(false)
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    if (transactionFilter === 'ALL') return true
    return transaction.type === transactionFilter
  })

  const handleAddRawMaterial = async () => {
    if (
      !rawMaterialForm.name ||
      !rawMaterialForm.unitPrice ||
      !rawMaterialForm.quantity ||
      !rawMaterialForm.unit
    ) {
      return toast({
        title: 'Gagal',
        description: 'Mohon isi semua kolom',
      })
    }

    try {
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawMaterialForm),
      })

      if (!response.ok) throw new Error()

      // 1️⃣ Refresh data dulu
      await fetchRawMaterials()
      await fetchTransactions()

      // 2️⃣ Reset form & TUTUP dialog
      setRawMaterialForm({
        name: '',
        unitPrice: '',
        quantity: '',
        unit: '',
      })
      setIsRawMaterialDialogOpen(false)

      // 3️⃣ BARU tampilkan toast
      toast({
        title: 'Berhasil',
        description: 'Bahan baku berhasil ditambahkan',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Gagal menambahkan bahan baku',
      })
    }
  }

  const handleEditRawMaterial = (material: RawMaterial) => {
    setEditingRawMaterial(material)
    setRawMaterialForm({
      name: material.name,
      unitPrice: material.unitPrice.toString(),
      quantity: material.quantity.toString(),
      unit: material.unit
    })
    setIsRawMaterialDialogOpen(true)
  }

  const handleUpdateRawMaterial = async () => {
    if (!editingRawMaterial) return

    try {
      const response = await fetch('/api/raw-materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRawMaterial.id,
          ...rawMaterialForm
        })
      })

      if (!response.ok) throw new Error()

      toast({
        title: 'Berhasil',
        description: 'Bahan baku berhasil diperbarui',
      })

      setIsRawMaterialDialogOpen(false)
      setEditingRawMaterial(null)

      await fetchRawMaterials()
      await fetchTransactions()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Bahan baku gagal diperbarui',
      })
    }
  }

  const handleDeleteRawMaterial = async (id: string) => {
    try {
      const response = await fetch(`/api/raw-materials?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error()

      toast({
        title: 'Berhasil',
        description: 'Bahan baku & riwayat transaksi berhasil dihapus',
      })

      await fetchRawMaterials()
      await fetchTransactions() // 🔥 WAJIB
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Bahan baku gagal dihapus',
      })
    }
  }


  // 9. Menu Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setMenuForm({ ...menuForm, image: reader.result as string })
      reader.readAsDataURL(file)
    }
  }
  const [menuLoading, setMenuLoading] = useState(false)
  const scrollYRef = useRef(0)
  const handleAddMenuSize = () => setMenuForm({ ...menuForm, sizes: [...menuForm.sizes, { size: '', price: '', stock: '' }] })
  const handleRemoveMenuSize = (index: number) => setMenuForm({ ...menuForm, sizes: menuForm.sizes.filter((_, i) => i !== index) })
  const handleMenuSizeChange = (index: number, field: string, value: string) => {
    const newSizes = [...menuForm.sizes]
    newSizes[index] = { ...newSizes[index], [field]: value }
    setMenuForm({ ...menuForm, sizes: newSizes })
  }

  const handleSubmitMenu = async () => {
    if (menuLoading) return
    setMenuLoading(true)
    scrollYRef.current = window.scrollY

    try {
      if (editingMenu) {
        await handleUpdateMenu()
      } else {
        await handleAddMenu()
      }
    } finally {
      setMenuLoading(false)
    }
  }

  const handleAddMenu = async () => {
    scrollYRef.current = window.scrollY
    if (!menuForm.name || !menuForm.image || menuForm.sizes.length === 0) {
      return toast({
        title: 'Gagal',
        description: 'Mohon isi semua kolom dan minimal satu ukuran',
      })
    }
    const hasInvalidSize = menuForm.sizes.some(
      s => !s.size || !s.price || !s.stock
    )

    if (hasInvalidSize) {
      return toast({
        title: 'Gagal',
        description: 'Mohon isi semua detail ukuran dengan benar',
      })
    }

    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuForm),
      })

      if (!response.ok) {
        throw new Error('Gagal menambahkan menu')
      }

      const newMenu = await response.json() // 🔥 WAJIB

      // ✅ UPDATE UI LANGSUNG
      setMenus(prev => [newMenu, ...prev])

      toast({
        title: 'Berhasil',
        description: 'Menu berhasil ditambahkan',
      })

      setMenuForm({
        name: '',
        image: '',
        sizes: [{ size: '', price: '', stock: '' }],
      })
      setIsMenuDialogOpen(false)

    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Menu gagal ditambahkan',
      })
    }
  }

  const handleUpdateMenu = async () => {
    if (!editingMenu) return

    try {
      const response = await fetch('/api/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMenu.id,
          ...menuForm,
        }),
      })

      if (!response.ok) {
        throw new Error('Gagal update menu')
      }

      // ✅ OPTIMISTIC UI UPDATE
      setMenus(prev =>
        prev.map(menu =>
          menu.id === editingMenu.id
            ? {
                ...menu,
                name: menuForm.name,
                image: menuForm.image,
                sizes: menuForm.sizes.map((s, i) => ({
                  ...menu.sizes[i],
                  size: s.size,
                  price: Number(s.price),
                  stock: Number(s.stock),
                })),
              }
            : menu
        )
      )
      scrollYRef.current = window.scrollY
      toast({
        title: 'Berhasil',
        description: 'Menu berhasil diperbarui',
      })

      setEditingMenu(null)
      setMenuForm({
        name: '',
        image: '',
        sizes: [{ size: '', price: '', stock: '' }],
      })
      setIsMenuDialogOpen(false)

    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Menu gagal diperbarui',
      })
    }
  }

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu)
    setMenuForm({
      name: menu.name,
      image: menu.image,
      sizes: menu.sizes.map(s => ({
        id: s.id, // ✅ PENTING
        size: s.size,
        price: s.price.toString(),
        stock: s.stock.toString(),
      })),
    })
    setIsMenuDialogOpen(true)
  }

  const handleDeleteMenu = async (id: string) => {
    scrollYRef.current = window.scrollY
    try {
      const response = await fetch(`/api/menus?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Menu berhasil dihapus',
        })
        fetchMenus()
      } else toast({
          title: 'Gagal',
          description: 'Gagal menghapus menu',
        })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Gagal menghapus menu',
      })
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!id) return toast({
        title: 'Gagal',
        description: 'ID transaksi tidak valid',
      })
    try {
      const response = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Transaksi berhasil dihapus',
        })
        await fetchTransactions()
        await fetchMenus()
      } else {
        const errorText = await response.text()
        console.error("Delete failed:", errorText)
        toast({
          title: 'Gagal',
          description: `Gagal menghapus transaksi: ${errorText}`,
        })
      }
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: 'Gagal',
        description: 'Gagal menghapus transaksi',
      })
    }
  }

  // 11. Report Handlers
  const handlePreviewReport = async () => {
    setIsPreviewLoading(true)
    try {
      const formatDateUTC = (date: Date | undefined) => {
        if (!date) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const startDateStr = formatDateUTC(startDate)
      const endDateStr = formatDateUTC(endDate)
      const response = await fetch(`/api/reports/preview?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (response.ok) {
        const data = await response.json()
        setReportPreview(data)
        toast({
          title: 'Berhasil',
          description: 'Preview laporan berhasil dimuat',
        })
      } else {
        toast({
          title: 'Gagal',
          description: 'Preview laporan gagal dimuat',
        })
        setReportPreview(null)
      }
    } catch (error) {
      console.error("Error fetching report preview:", error)
      toast({
        title: 'Gagal',
        description: 'Preview laporan gagal dimuat',
      })
      setReportPreview(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      const formatDateUTC = (date: Date | undefined) => {
        if (!date) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const startDateStr = formatDateUTC(startDate)
      const endDateStr = formatDateUTC(endDate)
      const response = await fetch(`/api/reports?startDate=${startDateStr}&endDate=${endDateStr}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = 'laporan-penjualan.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({
          title: 'Berhasil',
          description: 'Laporan berhasil diunduh',
        })
      } else toast({
          title: 'Gagal',
          description: 'Gagal mengunduh laporan',
        })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: 'Gagal',
        description: 'Gagal mengunduh laporan',
      })
    }
  }
 // 12. Download Receipt as PNG
const downloadReceiptPNG = async () => {
  if (!receiptRef.current) {
    console.error("REF STRUK TIDAK ADA")
    return
  }

  try {
    const dataUrl = await toPng(receiptRef.current, {
      cacheBust: true,
      pixelRatio: 3, // biar tajam di print
      backgroundColor: "white",
    })

    // 1. Ambil nama pembeli dan bersihkan karakter aneh
    const buyerName = printData?.buyerName || "pembeli"
    const safeName = buyerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // 2. Buat tanggal format DDMMYY
    const dateObj = new Date(printData?.date || Date.now());
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0'); // +1 karena Januari = 0
    const yy = String(dateObj.getFullYear()).slice(-2); // Ambil 2 digit terakhir
    const dateStr = `${dd}${mm}${yy}`;

    const link = document.createElement("a")
    // Format: struk-pembelian-nama_ddmmyy.png
    link.download = `struk-pembelian-${safeName}_${dateStr}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error("GAGAL BUAT STRUK PNG:", err)
  }
  }
  // Handler Print Pre-Order
  // Handler Print Pre-Order
  const handlePrintPreOrder = (po: any) => {
    // 1. Parse cart
    const cartItems = Array.isArray(po.cart) ? po.cart : JSON.parse(po.cart)

    // 2. Format data agar komponen struk tahu ini Pre-Order
    const formattedData = {
      id: po.id,
      buyerName: po.buyerName,
      totalAmount: po.totalAmount,
      date: po.createdAt,
      
      // ⬇️ INI YANG PENTING ⬇️
      // Tanpa baris ini, judul akan menjadi default "STRUK PEMBELIAN"
      receiptType: "PRE_ORDER", 

      items: cartItems.map((item: any) => ({
        menuName: item.menuName,
        sizeName: item.sizeName,
        qty: item.qty,
        price: item.price,
        // Optional mapping
        menu: { name: item.menuName },
        size: { size: item.sizeName }
      }))
    }

    // 3. Set data & Buka dialog
    setPrintData(formattedData)
    setIsPrintDialogOpen(true)
  }
  // 13. tambah manual transaksi
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [transactionFormMode, setTransactionFormMode] = useState<'ADD' | 'EDIT'>('ADD')
  const [manualTransactionForm, setManualTransactionForm] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const handleAddManualTransaction = async () => {
    if (loading) return
    setLoading(true)

    try {
      const isEdit = Boolean(editingTransactionId) // gunakan ini konsisten

      const response = await fetch('/api/transactions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isEdit ? editingTransactionId : undefined, // kirim id hanya jika edit
          type: manualTransactionForm.type,
          amount: Number(manualTransactionForm.amount),
          description: manualTransactionForm.description,
          date: manualTransactionForm.date,
          isManual: true, // pastikan flag manual dikirim ke backend
        }),
      })

      if (!response.ok) throw new Error('Response not OK')

      toast({
        title: 'Berhasil',
        description: isEdit
          ? 'Transaksi berhasil diperbarui'
          : 'Transaksi berhasil ditambahkan',
      })

      // reset form & state
      setIsAddTransactionOpen(false)
      setEditingTransactionId(null)
      setManualTransactionForm({
        type: 'EXPENSE',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      })

      fetchTransactions()
    } catch (err) {
      console.error('Error simpan transaksi:', err)
      toast({
        title: 'Gagal',
        description: 'Gagal menyimpan transaksi',
      })
    } finally {
      setLoading(false)
    }
  }

  // EFFECTS
  useEffect(() => {
    if (!isMenuDialogOpen && scrollYRef.current > 0) {
      window.scrollTo({
        top: scrollYRef.current,
        behavior: 'auto',
      })
      scrollYRef.current = 0
    }
  }, [isMenuDialogOpen])

  useEffect(() => {
    fetchRawMaterials()
    fetchMenus()
    fetchTransactions()
    fetchPreOrders()
  }, [])

  useEffect(() => {
    if (!shouldPrint || !receiptRef.current || !printData) return
    const doPrint = async () => {
       console.log("REF PRINT:", receiptRef.current)
      await new Promise(resolve => setTimeout(resolve, 300))
      const dataUrl = await toPng(receiptRef.current!, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "white",
      })
      const win = window.open("", "_blank")
      if (!win) return
      win.document.write(`
        <html><head><title>Cetak Struk</title><style>@page { size: 80mm auto; margin: 0 } body { margin: 0 } img { width: 100% }</style></head>
        <body><img src="${dataUrl}" /><script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300) }</script></body></html>
      `)
      setShouldPrint(false)
    }
    doPrint()
  }, [shouldPrint, printData])

  useEffect(() => {
  console.log('EDIT CART STATE:', editCart)
}, [editCart])

useEffect(() => {
  console.log('BUYER NAME STATE:', buyerName)
}, [buyerName])

useEffect(() => {
  if (editCart.length > 0) {
    setIsEditTransactionOpen(true)
  }
}, [editCart])


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Sistem Pendataan & Pembukuan</h1>
          <p className="text-muted-foreground">Kelola bahan baku, menu, dan transaksi dengan mudah</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="materials" className="flex items-center gap-2"><Package className="h-4 w-4" /><span className="hidden sm:inline">Bahan Baku</span></TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Menu</span></TabsTrigger>
            <TabsTrigger value="preorders" className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">Pre-Order</span></TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Transaksi</span></TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2"><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Laporan</span></TabsTrigger>
          </TabsList>

          {/* TAB MATERIAL */}
          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Bahan Baku</h2>
                <p className="text-muted-foreground">Kelola bahan baku untuk produk Anda</p>
              </div>
              <Dialog open={isRawMaterialDialogOpen} onOpenChange={setIsRawMaterialDialogOpen}>
                  <Button
                      onClick={() => {
                        setEditingRawMaterial(null)
                        setRawMaterialForm({
                          name: '',
                          unitPrice: '',
                          quantity: '',
                          unit: '',
                        })
                        setIsRawMaterialDialogOpen(true)
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Tambah Bahan Baku</span>
                  </Button>

                <DialogContent  onCloseAutoFocus={(e) => {e.preventDefault()}}>
                  <DialogHeader><DialogTitle>{editingRawMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle><DialogDescription>{editingRawMaterial ? 'Edit detail bahan baku' : 'Masukkan detail bahan baku baru'}</DialogDescription></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nama Bahan Baku</Label>
                      <Input id="name" value={rawMaterialForm.name} onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, name: e.target.value })} placeholder="Contoh: Tepung Terigu" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Harga Satuan (Rp)</Label><Input id="unitPrice" type="number" value={rawMaterialForm.unitPrice} onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, unitPrice: e.target.value })} placeholder="10000" /></div>
                      <div><Label>Jumlah/Kuantitas</Label><Input id="quantity" type="number" value={rawMaterialForm.quantity} onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, quantity: e.target.value })} placeholder="10" /></div>
                    </div>
                    <div><Label>Satuan</Label><Input id="unit" value={rawMaterialForm.unit} onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, unit: e.target.value })} placeholder="Contoh : Pcs, Buah, kg, liter dll" /></div>
                    <div className="bg-muted p-3 rounded-lg"><Label>Harga Total</Label><p className="text-2xl font-bold">Rp {((parseFloat(rawMaterialForm.unitPrice) || 0) * (parseFloat(rawMaterialForm.quantity) || 0)).toLocaleString('id-ID')}</p></div>
                    <Button
                      onClick={handleSubmitRawMaterial}
                      disabled={rawMaterialLoading}
                      className="w-full"
                    >
                      {rawMaterialLoading
                        ? editingRawMaterial
                          ? 'Mengupdate…'
                          : 'Menyimpan…'
                        : editingRawMaterial
                        ? 'Update'
                        : 'Simpan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center whitespace-nowrap">No</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Nama</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Harga Satuan</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Jumlah</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Satuan</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Harga Total</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawMaterials.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-muted-foreground whitespace-nowrap"
                          >
                            Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawMaterials.map((material, index) => (
                          <TableRow key={material.id}>
                            {/* NO */}
                            <TableCell className="text-center font-medium whitespace-nowrap">
                              {index + 1}
                            </TableCell>

                            {/* NAMA */}
                            <TableCell className="text-center font-medium whitespace-nowrap">
                              {material.name}
                            </TableCell>

                            {/* HARGA SATUAN */}
                            <TableCell className="text-center whitespace-nowrap">
                              Rp {material.unitPrice.toLocaleString('id-ID')}
                            </TableCell>

                            {/* JUMLAH */}
                            <TableCell className="text-center whitespace-nowrap">
                              {material.quantity}
                            </TableCell>

                            {/* SATUAN */}
                            <TableCell className="text-center whitespace-nowrap">
                              {material.unit}
                            </TableCell>

                            {/* TOTAL */}
                            <TableCell className="text-center font-semibold whitespace-nowrap">
                              Rp {material.totalPrice.toLocaleString('id-ID')}
                            </TableCell>

                            {/* AKSI */}
                            <TableCell className="text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditRawMaterial(material)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus Bahan Baku</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Apakah Anda yakin ingin menghapus bahan baku "{material.name}"?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteRawMaterial(material.id)}
                                      >
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB MENU */}
          <TabsContent value="menu" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Menu</h2>
                <p className="text-muted-foreground">Kelola menu produk Anda</p>
              </div>
              <Dialog open={isMenuDialogOpen} onOpenChange={(open) => {if (!open) {scrollYRef.current = window.scrollY}setIsMenuDialogOpen(open)}}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingMenu(null); setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] }) }} className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Menu</span></Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(e) => {e.preventDefault()}}>
                  <DialogHeader><DialogTitle>{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</DialogTitle><DialogDescription>{editingMenu ? 'Edit detail menu' : 'Masukkan detail menu baru'}</DialogDescription></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nama Menu</Label>
                      <Input id="menuName" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="Contoh: Ayam Bakar" />
                    </div>
                    <div>
                      <Label>Gambar Menu</Label>
                      <div className="flex items-center gap-4">
                        {menuForm.image && (<div className="w-24 h-24 rounded-lg overflow-hidden border"><img src={menuForm.image} alt="Preview" className="w-full h-full object-cover" /></div>)}
                        <div className="flex-1"><Input id="menuImage" type="file" accept="image/*" onChange={handleImageUpload} /></div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Ukuran & Harga</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddMenuSize}><Plus className="h-4 w-4 mr-1" /> Tambah Ukuran</Button>
                      </div>
                      {menuForm.sizes.map((size, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                          <div className="col-span-4"><Label htmlFor={`size-${index}`} className="text-xs">Ukuran</Label><Input id={`size-${index}`} value={size.size} onChange={(e) => handleMenuSizeChange(index, 'size', e.target.value)} placeholder="250gr" /></div>
                          <div className="col-span-3"><Label htmlFor={`price-${index}`} className="text-xs">Harga</Label><Input id={`price-${index}`} type="number" value={size.price} onChange={(e) => handleMenuSizeChange(index, 'price', e.target.value)} placeholder="15000" /></div>
                          <div className="col-span-3"><Label htmlFor={`stock-${index}`} className="text-xs">Stok</Label><Input id={`stock-${index}`} type="number" value={size.stock} onChange={(e) => handleMenuSizeChange(index, 'stock', e.target.value)} placeholder="10" /></div>
                          <div className="col-span-2">{menuForm.sizes.length > 1 && (<Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMenuSize(index)}><Trash2 className="h-4 w-4" /></Button>)}</div>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleSubmitMenu}
                      disabled={menuLoading}
                      className="w-full"
                    >
                      {menuLoading
                        ? editingMenu
                          ? 'Mengupdate…'
                          : 'Menyimpan…'
                        : editingMenu
                        ? 'Update'
                        : 'Simpan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* FORM PEMBELIAN ALL-IN-ONE */}
            <Card className="border border-blue-300 bg-blue-50/30 rounded-lg bg-white">
              <CardHeader className="flex flex-col items-start justify-between bg-blue-50">
                <div>
                  <CardTitle>Form Transaksi</CardTitle>
                  <CardDescription>Proses Transaksi Tunai atau Simpan Pre-Order</CardDescription>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-blue-200">
                  <button onClick={() => setTransactionMode('cash')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${transactionMode === 'cash' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Tunai</button>
                  <button onClick={() => setTransactionMode('preorder')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${transactionMode === 'preorder' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>Pre-Order</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Label htmlFor="buyerName" className="font-semibold">Nama Pembeli <span className="text-red-500">*</span></Label>
                <Input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Masukkan nama pembeli..." />
                <div className="border rounded-lg bg-white">
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <table>
                      <thead>
                        <tr>
                          <th className="p-3 text-center whitespace-nowrap">Menu</th>
                          <th className="p-3 text-center whitespace-nowrap">Ukuran</th>
                          <th className="p-3 text-center whitespace-nowrap">Jumlah</th>
                          <th className="p-3 text-center whitespace-nowrap">Harga</th>
                          <th className="p-3 text-center whitespace-nowrap">Subtotal</th>
                          <th className="p-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.length === 0 ? (<tr><td colSpan="6" className="py-4 text-center text-gray-400 italic">Belum ada item yang dipilih.</td></tr>) : cart.map((item, index) => (
                          <tr key={index}>
                            <td className="p-3 text-center font-medium whitespace-nowrap">{item.menuName}</td>
                            <td className="text-center whitespace-nowrap">{item.sizeName}</td>
                            <td className="text-center font-mono whitespace-nowrap">{item.qty}</td>
                            <td className="text-center whitespace-nowrap">Rp {item.price.toLocaleString('id-ID')}</td>
                            <td className="text-center whitespace-nowrap">Rp {(item.price * item.qty).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center whitespace-nowrap"><Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart); }}>X</Button></td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                  
                </div>
                <div className="flex justify-end">
                  <div className="p-3 bg-white border rounded-md text-right min-w-[200px]">
                    <span className="text-sm text-gray-500 block">Total Bayar:</span>
                    <div className="text-xl font-bold text-blue-600">Rp {cart.reduce((total, item) => total + (item.price * item.qty), 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-2">
                  {transactionMode === 'cash' && (<Button onClick={handleProcessTransaction} disabled={loading || cart.length === 0 || !buyerName} className="bg-blue-600 hover:bg-blue-700"><Wallet className="h-4 w-4 mr-2" /> {loading ? 'Memproses…' : 'Proses & Cetak'}</Button>)}
                  {transactionMode === 'preorder' && (<Button onClick={handleSaveAsPreOrder} disabled={loading || cart.length === 0 || !buyerName} className="bg-yellow-500 hover:bg-yellow-600"><ShoppingBag className="h-4 w-4 mr-2" /> {loading ? 'Menyimpan…' : 'Simpan Pre-Order'}</Button>)}
                  <Button variant="outline" onClick={() => { setCart([]); setBuyerName(""); }} disabled={cart.length === 0}>Reset Form</Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Belum ada menu. Klik "Tambah Menu" untuk memulai.
                </div>
              ) : menus.map((menu) => (
                <Card key={menu.id} className="flex flex-col overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* IMAGE */}
                  <div className="relative w-full h-36 sm:h-40 md:h-48 bg-muted overflow-hidden">
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* HEADER */}
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{menu.name}</CardTitle>
                    <CardDescription>{menu.sizes.length} {menu.sizes.length > 1 ? 'ukuran' : 'ukuran'} tersedia</CardDescription>
                  </CardHeader>

                  {/* SIZES */}
                  <CardContent className="flex flex-col gap-2">
                    {menu.sizes.map((size) => (
                    <div
                      key={size.id}
                      className="flex justify-between items-center text-sm bg-white p-2 rounded border shadow-sm"
                    >
                      {/* Ukuran */}
                      <div className="flex-1 min-w-0 flex justify-center items-center">
                        <span className="font-semibold truncate text-center w-full">
                          {size.size}
                        </span>
                      </div>

                      {/* Harga */}
                      <div className="flex-shrink-0 flex justify-center items-center mx-2 min-w-[80px]">
                        <span className="text-gray-700 font-semibold text-center">
                          Harga: Rp. {size.price.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Stok */}
                      <div className="flex-shrink-0 flex justify-center items-center mx-2 min-w-[60px]">
                        <span className={`text-xs font-medium text-center ${size.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Stok: {size.stock}
                        </span>
                      </div>

                      {/* Tombol Add */}
                      <div className="flex-shrink-0 flex justify-center items-center">
                        <Button
                          size="sm"
                          className="h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => addToCart(menu, size)}
                          disabled={size.stock <= 0}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    ))}

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMenu(menu)}
                        className="flex-1 min-w-[120px]"
                      >
                        <Edit className="h-4 w-4 mr-2" /> Edit Menu
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="min-w-[40px]">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Menu</AlertDialogTitle>
                            <AlertDialogDescription>Apakah Anda yakin ingin menghapus menu "{menu.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMenu(menu.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

          </TabsContent>
          
          {/* TAB PRE-ORDER */}
          <TabsContent value="preorders" className="space-y-6">
            {/* DAFTAR PRE-ORDER */}
            {savedPreOrders.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    Daftar Pre-Order
                  </h3>
                  <p className="text-sm text-gray-500">
                    Pesanan disimpan, klik tombol hijau untuk ambil/tunai
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedPreOrders.map((po) => {
                    const cartItems = parseCart(po.cart)

                    return (
                      <Card
                        key={po.id}
                        className="border-l-4 border-l-yellow-500 flex flex-col"
                      >
                        {/* HEADER */}
                        <CardHeader className="bg-yellow-50">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base line-clamp-1">
                              {po.buyerName}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {new Date(po.createdAt).toLocaleString('id-ID')}
                            </Badge>
                          </div>

                          <CardDescription>
                            {cartItems.length} item
                          </CardDescription>
                        </CardHeader>

                        {/* CONTENT */}
                        <CardContent className="flex flex-col flex-1">
                          {/* LIST ITEM (GANTI TABLE) */}
                          <div className="space-y-2 mb-3 max-h-[260px] overflow-y-auto pr-1">
                            {cartItems.map((c, idx) => (
                              <div
                                key={idx}
                                className="
                                  flex justify-between items-start gap-3
                                  text-sm bg-white p-2 rounded
                                  border shadow-sm
                                "
                              >
                                {/* KIRI — INFO MENU */}
                                <div className="flex flex-col gap-1 min-w-0">
                                  <p
                                    className="font-medium text-gray-800 break-words"
                                    title={c.menuName}
                                  >
                                    {c.menuName}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <Badge variant="secondary">Ukuran : {c.sizeName}</Badge>
                                    <span className="whitespace-nowrap">
                                      Harga : Rp. {c.price.toLocaleString('id-ID')}
                                    </span>
                                    <span className="whitespace-nowrap">
                                      Jumlah : {c.qty}
                                    </span>
                                  </div>
                                </div>

                                {/* KANAN — QTY */}
                                <div className="text-right shrink-0 font-medium whitespace-nowrap">
                                  
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* TOTAL */}
                          <div className="text-right mb-3">
                            <span className="font-semibold">Total: </span>
                            <span className="font-medium">
                              Rp {po.totalAmount.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {/* BUTTON — SELALU DI BAWAH */}
                          <div className="flex justify-end gap-2 mt-auto pt-3">
                            
                            <Button
                              onClick={() => handleProcessSavedOrder(po)}
                              disabled={processingOrderId === po.id || po.status === 'taken'}
                            >
                              {processingOrderId === po.id
                                ? 'Memproses…'
                                : 'Simpan Pre-Order'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPreOrderClick(po)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintPreOrder(po)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDeletePreOrder(po.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* TAB TRANSAKSI */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">Riwayat Transaksi</h2>
                <p className="text-muted-foreground">
                  Lihat semua transaksi pemasukan dan pengeluaran
                </p>
              </div>

              {/* TOMBOL TAMBAH TRANSAKSI */}
              <Button
                onClick={() => {
                  setTransactionFormMode('ADD')
                  setIsAddTransactionOpen(true)
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Transaksi
              </Button>
            </div>

            {/* STATISTIK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    Rp {totalIncome.toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    Rp {totalExpense.toLocaleString('id-ID')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Item Terjual</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSales} item</div>
                </CardContent>
              </Card>
            </div>

            {/* TABEL TRANSAKSI */}
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Riwayat Transaksi</CardTitle>

                  <Select
                    value={transactionFilter}
                    onValueChange={(value) =>
                      setTransactionFilter(value as 'ALL' | 'INCOME' | 'EXPENSE')
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter transaksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua</SelectItem>
                      <SelectItem value="INCOME">Pemasukan</SelectItem>
                      <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center whitespace-nowrap">No</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Tanggal</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Tipe</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Deskripsi</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Jumlah</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Tidak ada transaksi
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((transaction, index) => {
                          const canEditManual = transaction.isManual === true
                          const isLegacy =
                          (transaction.type === 'EXPENSE' && transaction.isManual === false && transaction.rawMaterialId === null) ||
                          (transaction.type === 'INCOME' && transaction.isManual === false && !transaction.salesHeaderId)

                          return (
                            <TableRow key={transaction.id} className="hover:bg-muted/50">
                              <TableCell className="text-center">{index + 1}</TableCell>
                              <TableCell className="text-center">{formatDate(transaction.date)}</TableCell>
                              <TableCell className="text-center">
                                <span className={transaction.type === 'INCOME' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                                </span>
                                {isLegacy && (
                                  <span className="ml-2 text-xs text-muted-foreground italic">(Data lama)</span>
                                )}
                              </TableCell>

                              <TableCell>
                                <div>
                                  <p className="max-w-[220px] truncate" title={transaction.description}>
                                    {transaction.description || '-'}
                                  </p>
                                  {transaction.salesHeader?.buyerName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Pembeli: {transaction.salesHeader.buyerName}
                                    </p>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className={`text-center font-semibold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'INCOME' ? '+' : '-'} Rp {transaction.amount.toLocaleString('id-ID')}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">

                                  {/* EDIT INCOME DARI PENJUALAN */}
                                  {transaction.type === 'INCOME' && transaction.salesHeader && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditTransactionClick(transaction.salesHeader.id)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* EDIT TRANSAKSI MANUAL */}
                                  {canEditManual && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setTransactionFormMode('EDIT')
                                        setEditingTransactionId(transaction.id)

                                        setManualTransactionForm({
                                          type: transaction.type,
                                          amount: transaction.amount.toString(),
                                          description: transaction.description || '',
                                          date: transaction.date.split('T')[0],
                                        })

                                        setIsAddTransactionOpen(true)
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* PRINT INCOME */}
                                  {transaction.type === 'INCOME' && transaction.salesHeader && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePrintTransaction(transaction)}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* DELETE */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                                        <AlertDialogDescription>Transaksi ini akan dihapus permanen.</AlertDialogDescription>
                                      </AlertDialogHeader>

                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                          Hapus
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* DIALOG FORM MANUAL */}
            <Dialog
              open={isAddTransactionOpen}
              onOpenChange={(open) => {
                setIsAddTransactionOpen(open)
                if (!open) {
                  setTransactionFormMode('ADD')
                  setEditingTransactionId(null)
                  setManualTransactionForm({
                    type: 'EXPENSE',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                  })
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{transactionFormMode === 'EDIT' ? 'Edit Transaksi' : 'Tambah Transaksi'}</DialogTitle>
                  <DialogDescription>
                    {transactionFormMode === 'EDIT' ? 'Perbarui transaksi manual' : 'Catat pemasukan atau pengeluaran manual'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Tipe Transaksi</Label>
                    <Select
                      value={manualTransactionForm.type}
                      onValueChange={(value) =>
                        setManualTransactionForm({
                          ...manualTransactionForm,
                          type: value as 'INCOME' | 'EXPENSE',
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Pemasukan</SelectItem>
                        <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tanggal</Label>
                    <Input
                      type="date"
                      value={manualTransactionForm.date}
                      onChange={(e) =>
                        setManualTransactionForm({ ...manualTransactionForm, date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Nominal</Label>
                    <Input
                      type="number"
                      value={manualTransactionForm.amount}
                      onChange={(e) =>
                        setManualTransactionForm({ ...manualTransactionForm, amount: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Deskripsi (Opsional)</Label>
                    <Input
                      value={manualTransactionForm.description}
                      onChange={(e) =>
                        setManualTransactionForm({ ...manualTransactionForm, description: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    onClick={handleAddManualTransaction}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat…</>) : (transactionFormMode === 'EDIT' ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* TAB LAPORAN */}
          <TabsContent value="reports" className="space-y-6">
            <div><h2 className="text-2xl font-bold mb-2">Laporan Penjualan</h2><p className="text-muted-foreground">Generate dan ekspor laporan penjualan</p></div>
            <Card>
              <CardHeader><CardTitle>Filter Laporan</CardTitle><CardDescription>Pilih rentang tanggal untuk laporan yang ingin dilihat</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, 'PPP', { locale: undefined }) : 'Pilih tanggal'}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Tanggal Akhir</Label>
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, 'PPP', { locale: undefined }) : 'Pilih tanggal'}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handlePreviewReport} disabled={isPreviewLoading} className="gap-2">{isPreviewLoading ? 'Memuat...' : (<><FileText className="h-4 w-4" />Preview Laporan</>)}</Button>
                  <Button variant="outline" onClick={() => { setStartDate(undefined); setEndDate(undefined); setReportPreview(null); fetchTransactions() }}>Reset Filter</Button>
                </div>
              </CardContent>
            </Card>
            {reportPreview && (
              <>
                <Card>
                  <CardHeader><CardTitle>Ringkasan Laporan</CardTitle><CardDescription>Periode: {reportPreview.dateRange.startDate ? reportPreview.dateRange.startDate : 'Awal'} - {reportPreview.dateRange.endDate ? reportPreview.dateRange.endDate : 'Sekarang'}</CardDescription></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Pemasukan</p><p className="text-2xl font-bold text-green-600">Rp {reportPreview.totalIncome.toLocaleString('id-ID')}</p></div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Pengeluaran</p><p className="text-2xl font-bold text-red-600">Rp {reportPreview.totalExpense.toLocaleString('id-ID')}</p></div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><p className="text-sm text-muted-foreground mb-1">Pendapatan Bersih</p><p className={`text-2xl font-bold ${reportPreview.totalIncome - reportPreview.totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {(reportPreview.totalIncome - reportPreview.totalExpense).toLocaleString('id-ID')}</p></div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Item Terjual</p><p className="text-2xl font-bold text-purple-600">{reportPreview.totalSales} item</p></div>
                    </div>
                  </CardContent>
                </Card>
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 border-b bg-muted"><h3 className="font-semibold">Riwayat Transaksi</h3></div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[650px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                            <TableHead className="whitespace-nowrap">Tipe</TableHead>
                            <TableHead className="whitespace-nowrap">Deskripsi</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Jumlah</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportPreview.transactions.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada transaksi dalam periode ini</TableCell></TableRow>) : reportPreview.transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                              <TableCell className="whitespace-nowrap">
                              <span
                                className={
                                  transaction.type === 'INCOME'
                                    ? 'text-emerald-600 font-semibold'
                                    : 'text-red-600 font-semibold'
                                }
                              >
                                {transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                              </span>
                            </TableCell>
                              <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={transaction.description}>{transaction.description}</TableCell>
                              <TableCell className={`text-right font-semibold whitespace-nowrap ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>{transaction.type === 'INCOME' ? '+' : '-'} Rp {transaction.amount.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 border-b bg-muted"><h3 className="font-semibold">Riwayat Penjualan</h3></div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                            <TableHead className="whitespace-nowrap">Menu</TableHead>
                            <TableHead className="whitespace-nowrap">Ukuran</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Harga</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Jumlah</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportPreview.sales.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada penjualan dalam periode ini</TableCell></TableRow>) : reportPreview.sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="whitespace-nowrap">{formatDate(sale.date)}</TableCell>
                              <TableCell className="whitespace-nowrap">{sale.menu.name}</TableCell>
                              <TableCell className="whitespace-nowrap">{sale.size.size}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">Rp {sale.price.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">{sale.quantity}</TableCell>
                              <TableCell className="text-right font-semibold whitespace-nowrap">Rp {sale.total.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                <Card><CardContent className="pt-6"><Button onClick={handleExportPDF} className="w-full gap-2" size="lg"><Download className="h-5 w-5" />Export PDF</Button></CardContent></Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sell Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        {/* Content kosong karena dialog sell logic sudah tergabung di handleProcessTransaction */}
      </Dialog>

      {/* Download Receipt Dialog */}
      <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Download Struk?</AlertDialogTitle>
            <AlertDialogDescription>
              Berikut preview struk yang akan diunduh.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* PREVIEW STRUK */}
          <div className="flex justify-center my-4">
            <div className="border rounded bg-white shadow p-2 scale-90">
              <ReceiptPreview ref={receiptRef} data={printData} />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>

            <AlertDialogAction
              onClick={async () => {
                await new Promise(r => setTimeout(r, 100))
                await downloadReceiptPNG()
                setIsPrintDialogOpen(false)
              }}
            >
              Download Struk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
            <DialogDescription>
              Edit nama pembeli, ukuran, dan jumlah. Stok otomatis disesuaikan.
            </DialogDescription>
          </DialogHeader>

          {/* Nama Pembeli */}
          <div className="space-y-1">
            <Label>Nama Pembeli</Label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>

          {/* Scrollable List Item */}
          <div className="flex-1 overflow-y-auto border rounded-lg mt-4 pr-1">
            <div className="hidden md:block"> {/* Tampilan Tabel untuk Desktop */}
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left">Menu</th>
                    <th className="p-3 text-center">Ukuran</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Harga</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {editCart.map((item, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50 transition">
                      {/* Menu */}
                      <td className="p-3 font-medium min-w-[150px] max-w-[200px]">
                        <div className="truncate" title={item.menuName}>
                          {item.menuName}
                        </div>
                      </td>
                      {/* Size */}
                      <td className="p-3 text-center">
                        <Select
                          value={item.sizeId}
                          onValueChange={(value) => {
                            const newSize = item.sizes.find((s: any) => s.id === value)
                            const newCart = [...editCart]
                            newCart[index] = {
                              ...item,
                              sizeId: newSize.id,
                              sizeName: newSize.size,
                              price: newSize.price
                            }
                            setEditCart(newCart)
                          }}
                        >
                          <SelectTrigger className="w-[100px] mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.sizes.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Qty */}
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const newCart = [...editCart]
                            newCart[index].qty = Number(e.target.value)
                            setEditCart(newCart)
                          }}
                          className="w-16 text-center mx-auto"
                        />
                      </td>
                      {/* Harga */}
                      <td className="p-3 text-right whitespace-nowrap text-xs">
                        Rp {item.price.toLocaleString('id-ID')}
                      </td>
                      {/* Subtotal */}
                      <td className="p-3 text-right font-semibold whitespace-nowrap text-xs">
                        Rp {(item.price * item.qty).toLocaleString('id-ID')}
                      </td>
                      {/* Aksi */}
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          onClick={() => {
                            const newCart = [...editCart]
                            newCart.splice(index, 1)
                            setEditCart(newCart)
                          }}
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3"> {/* Tampilan Card untuk Mobile */}
              {editCart.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm break-words flex-1">{item.menuName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 h-6 w-6 p-0 ml-2"
                      onClick={() => {
                        const newCart = [...editCart]
                        newCart.splice(index, 1)
                        setEditCart(newCart)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Ukuran</Label>
                      <Select
                        value={item.sizeId}
                        onValueChange={(value) => {
                          const newSize = item.sizes.find((s: any) => s.id === value)
                          const newCart = [...editCart]
                          newCart[index] = {
                            ...item,
                            sizeId: newSize.id,
                            sizeName: newSize.size,
                            price: newSize.price
                          }
                          setEditCart(newCart)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.sizes.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => {
                          const newCart = [...editCart]
                          newCart[index].qty = Number(e.target.value)
                          setEditCart(newCart)
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-2 flex justify-between items-end border-t pt-2 mt-1">
                      <div>
                        <div className="text-xs text-gray-500">Harga</div>
                        <div className="text-xs">Rp {item.price.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Subtotal</div>
                        <div className="font-bold text-sm">Rp {(item.price * item.qty).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 mt-2 border-t shrink-0">
            <div className="text-lg font-bold">
              Total: Rp{' '}
              {editCart
                .reduce((s, i) => s + i.price * i.qty, 0)
                .toLocaleString('id-ID')}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditTransactionOpen(false)}>
                Batal
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleUpdateTransaction}
                disabled={isSaving}
              >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Menyimpan…</> : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pre-Order Dialog */}
      <Dialog open={isEditPreOrderOpen} onOpenChange={setIsEditPreOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Pre-Order</DialogTitle>
            <DialogDescription>
              Ubah jumlah atau ukuran pesanan pre-order.
            </DialogDescription>
          </DialogHeader>

          {/* Nama Pembeli */}
          <div className="space-y-1">
            <Label>Nama Pembeli</Label>
            <Input
              value={editPreOrderBuyerName}
              onChange={(e) => setEditPreOrderBuyerName(e.target.value)}
            />
          </div>

          {/* Scrollable List Item */}
          <div className="flex-1 overflow-y-auto border rounded-lg mt-4 pr-1">
            <div className="hidden md:block"> {/* Tampilan Tabel untuk Desktop */}
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left">Menu</th>
                    <th className="p-3 text-center">Ukuran</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Harga</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {editPreOrderCart.map((item, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50 transition">
                      {/* Menu */}
                      <td className="p-3 font-medium min-w-[150px] max-w-[200px]">
                        <div className="truncate" title={item.menuName}>
                          {item.menuName}
                        </div>
                      </td>
                      {/* Size */}
                      <td className="p-3 text-center">
                        <Select
                          value={item.sizeId}
                          onValueChange={(value) => {
                            const newSize = item.sizes.find((s: any) => s.id === value)
                            const newCart = [...editPreOrderCart]
                            newCart[index] = {
                              ...item,
                              sizeId: newSize.id,
                              sizeName: newSize.size,
                              price: newSize.price
                            }
                            setEditPreOrderCart(newCart)
                          }}
                        >
                          <SelectTrigger className="w-[100px] mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.sizes.map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Qty */}
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const newCart = [...editPreOrderCart]
                            newCart[index].qty = Number(e.target.value)
                            setEditPreOrderCart(newCart)
                          }}
                          className="w-16 text-center mx-auto"
                        />
                      </td>
                      {/* Harga */}
                      <td className="p-3 text-right whitespace-nowrap text-xs">
                        Rp {item.price.toLocaleString('id-ID')}
                      </td>
                      {/* Subtotal */}
                      <td className="p-3 text-right font-semibold whitespace-nowrap text-xs">
                        Rp {(item.price * item.qty).toLocaleString('id-ID')}
                      </td>
                      {/* Aksi */}
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          onClick={() => {
                            const newCart = [...editPreOrderCart]
                            newCart.splice(index, 1)
                            setEditPreOrderCart(newCart)
                          }}
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3"> {/* Tampilan Card untuk Mobile */}
              {editPreOrderCart.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm break-words flex-1">{item.menuName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 h-6 w-6 p-0 ml-2"
                      onClick={() => {
                        const newCart = [...editPreOrderCart]
                        newCart.splice(index, 1)
                        setEditPreOrderCart(newCart)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Ukuran</Label>
                      <Select
                        value={item.sizeId}
                        onValueChange={(value) => {
                          const newSize = item.sizes.find((s: any) => s.id === value)
                          const newCart = [...editPreOrderCart]
                          newCart[index] = {
                            ...item,
                            sizeId: newSize.id,
                            sizeName: newSize.size,
                            price: newSize.price
                          }
                          setEditPreOrderCart(newCart)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {item.sizes.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => {
                          const newCart = [...editPreOrderCart]
                          newCart[index].qty = Number(e.target.value)
                          setEditPreOrderCart(newCart)
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-2 flex justify-between items-end border-t pt-2 mt-1">
                      <div>
                        <div className="text-xs text-gray-500">Harga</div>
                        <div className="text-xs">Rp {item.price.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Subtotal</div>
                        <div className="font-bold text-sm">Rp {(item.price * item.qty).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 mt-2 border-t shrink-0">
            <div className="text-lg font-bold">
              Total: Rp{' '}
              {editPreOrderCart
                .reduce((s, i) => s + i.price * i.qty, 0)
                .toLocaleString('id-ID')}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditPreOrderOpen(false)}>
                Batal
              </Button>
              <Button
                className="bg-yellow-500 hover:bg-yellow-600"
                onClick={handleUpdatePreOrder}
                disabled={isSaving}
              >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Menyimpan…</> : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview for Printing */}
      {printData && (
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <ReceiptPreview ref={receiptRef} data={printData} />
        </div>
      )}
    </div>
  )
}