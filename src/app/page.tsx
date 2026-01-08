'use client'
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
import { Package, Plus, Edit, Trash2, ShoppingCart, FileText, Wallet, TrendingUp, TrendingDown, Download, Calendar as CalendarIcon, Image as ImageIcon, Printer, ShoppingBag } from 'lucide-react'
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
  const {toast} = useToast()

  // State Form & UI
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false)
  const [editingTransactionData, setEditingTransactionData] = useState<any>(null)
  const [editCart, setEditCart] = useState<any[]>([])
  const [transactionMode, setTransactionMode] = useState<'cash' | 'preorder'>('cash')
  const [cart, setCart] = useState<CartItem[]>([])
  const [buyerName, setBuyerName] = useState("")
  
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
        toast({
          title: 'Stok Tidak Cukup',
          description: `Menu ${errorData.menuName} (${errorData.sizeName}) hanya tersisa ${errorData.remainingStock} pcs.`,
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
    }
  }

  // 4. Process Tunai Biasa
const handleProcessTransaction = async () => {
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
  }
}


  // 5. Print Transaction
  const handlePrintTransaction = async (transaction: any) => {
    try {
      const salesHeaderId = transaction.salesHeader?.id
      if (!salesHeaderId) return toast({
        title: 'Gagal',
        description: 'ID sales header tidak ditemukan',
      })

      const res = await fetch(`/api/sales-header-detail?id=${salesHeaderId}`)
      if (!res.ok) throw new Error("Gagal ambil detail")

      const detail = await res.json()
      setPrintData(detail)
      setTimeout(() => {
        const doPrint = async () => {
          downloadReceiptPNG()
           if (!receiptRef.current) return
           await new Promise(resolve => setTimeout(resolve, 300))
           const dataUrl = await toPng(receiptRef.current!, {
             cacheBust: true,
             pixelRatio: 3,
             backgroundColor: "white",
           })
          //  const win = window.open("", "_blank")
          //  if (!win) return
          //  win.document.write(`
          //    <html><head><title>Cetak Struk</title><style>@page { size: 80mm auto; margin: 0 } body { margin: 0 } img { width: 100% }</style></head>
          //    <body><img src="${dataUrl}" /><script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300) }</script></body></html>
          //  `)
        }
        doPrint()
      }, 300)

    } catch (err) {
      console.error("PRINT ERROR:", err)
      toast({
        title: 'Gagal',
        description: 'Gagal ambil detail transaksi',
      })
    }
  }

  // 6. Edit Transaction
  const handleEditTransactionClick = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/sales-header-detail?id=${transactionId}`)
      if (!response.ok) return toast({
        title: 'Gagal',
        description: 'Data gagal diambil',
      })
      const data = await response.json()
      setEditingTransactionData(data)
      const formattedItems = data.items.map((item: any) => ({
        menuId: item.menuId,
        menuName: item.menu.name,
        sizeId: item.sizeId,
        sizeName: item.size.size,
        price: item.price,
        qty: item.quantity
      }))
      setEditCart(formattedItems)
      setIsEditTransactionOpen(true)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan sistem',
      })
    }
  }

  const handleUpdateTransaction = async () => {
    if (!editingTransactionData || !editingTransactionData.id) return toast({
      title: 'Gagal',
      description: 'Data transaksi tidak valid',
    })
    const totalAmount = editCart.reduce((sum, item) => sum + (item.price * item.qty), 0)

    try {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransactionData.id,
          type: 'INCOME',
          buyerName: editingTransactionData.buyerName,
          items: editCart
        })
      })
      const result = await response.json()
      if (!response.ok) {
        console.error("Gagal Update:", result)
        return toast({
          title: 'Gagal',
          description: 'Transaksi gagal diperbarui',
        })
      }
      toast({
        title: 'Berhasil',
        description: 'Transaksi berhasil diperbarui',
      })
      setIsEditTransactionOpen(false)
      fetchTransactions()
      fetchMenus()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Transaksi gagal diperbarui',
      })
    }
  }

  // 7. Cart Logic
  const addToCart = (menu: Menu, size: Size) => {
    const existingItemIndex = cart.findIndex((item) => item.menuId === menu.id && item.sizeId === size.id)
    if (existingItemIndex > -1) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].qty += 1
      setCart(updatedCart)
    } else {
      setCart([...cart, {
        menuId: menu.id,
        menuName: menu.name,
        sizeId: size.id,
        sizeName: size.size,
        price: size.price,
        qty: 1
      }])
    }
  }

  const removeFromCart = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    setCart(newCart)
  }

  // 8. Material Logic
  const handleAddRawMaterial = async () => {
    if (!rawMaterialForm.name || !rawMaterialForm.unitPrice || !rawMaterialForm.quantity || !rawMaterialForm.unit) return toast({
        title: 'Gagal',
        description: 'Mohon isi semua kolom',
      })
    try {
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawMaterialForm)
      })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Penjualan berhasil dicatat',
        })
        setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
        setIsRawMaterialDialogOpen(false)
        fetchRawMaterials()
        fetchTransactions()
      } else toast({
        title: 'Gagal',
        description: 'Gagal menambahkan bahan baku',
      })
    } catch (error) {
      console.error('Error adding raw material:', error)
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
        body: JSON.stringify({ id: editingRawMaterial.id, ...rawMaterialForm })
      })
      if (response.ok) {
        toast({
        title: 'Gagal',
        description: 'Bahan baku berhasil diperbarui',
      })
        setEditingRawMaterial(null)
        setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
        setIsRawMaterialDialogOpen(false)
        fetchRawMaterials()
        fetchTransactions()
      } else toast({
        title: 'Gagal',
        description: 'Bahan baku gagal diperbarui',
      })
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
      const response = await fetch(`/api/raw-materials?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Bahan baku berhasil dihapus',
        })
        fetchRawMaterials()
      } else toast({
        title: 'Gagal',
        description: 'Bahan baku gagal dihapus',
      })
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

  const handleAddMenuSize = () => setMenuForm({ ...menuForm, sizes: [...menuForm.sizes, { size: '', price: '', stock: '' }] })
  const handleRemoveMenuSize = (index: number) => setMenuForm({ ...menuForm, sizes: menuForm.sizes.filter((_, i) => i !== index) })
  const handleMenuSizeChange = (index: number, field: string, value: string) => {
    const newSizes = [...menuForm.sizes]
    newSizes[index] = { ...newSizes[index], [field]: value }
    setMenuForm({ ...menuForm, sizes: newSizes })
  }

  const handleAddMenu = async () => {
    if (!menuForm.name || !menuForm.image || menuForm.sizes.length === 0) return toast({
        title: 'Gagal',
        description: 'Mohon isi semua kolom dan minimal satu ukuran',
      })
    const hasInvalidSize = menuForm.sizes.some(s => !s.size || !s.price || !s.stock)
    if (hasInvalidSize) return toast({
        title: 'Gagal',
        description: 'Mohon isi semua detail ukuran dengan benar',
      })
    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuForm)
      })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Menu berhasil ditambahkan',
        })
        setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] })
        setIsMenuDialogOpen(false)
        fetchMenus()
      } else toast({
        title: 'Gagal',
        description: 'Menu gagal ditambahkan',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Menu gagal ditambahkan',
      })
    }
  }

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu)
    setMenuForm({
      name: menu.name,
      image: menu.image,
      sizes: menu.sizes.map(s => ({ size: s.size, price: s.price.toString(), stock: s.stock.toString() }))
    })
    setIsMenuDialogOpen(true)
  }

  const handleUpdateMenu = async () => {
    if (!editingMenu) return
    try {
      const response = await fetch('/api/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingMenu.id, ...menuForm })
      })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Menu berhasil diperbarui',
        })
        setEditingMenu(null)
        setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] })
        setIsMenuDialogOpen(false)
        fetchMenus()
      } else toast({
          title: 'Gagal',
          description: 'Menu gagal diperbarui',
        })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Gagal',
        description: 'Menu gagal diperbarui',
      })
    }
  }

  const handleDeleteMenu = async (id: string) => {
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

  // 10. Sell Logic (Sell Menu yang hilang)
  const handleSell = async () => {
    if (!selectedMenuForSell || !selectedSizeForSell) return toast({
        title: 'Gagal',
        description: 'Mohon pilih menu dan ukuran',
      })
    if (sellQuantity > selectedSizeForSell.stock) return toast({
        title: 'Gagal',
        description: 'Stok tidak mencukupi',
      })
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: selectedMenuForSell.id, sizeId: selectedSizeForSell.id, quantity: sellQuantity })
      })
      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Penjualan berhasil',
        })
        setIsSellDialogOpen(false)
        setSelectedMenuForSell(null)
        setSelectedSizeForSell(null)
        setSellQuantity(1)
        fetchMenus()
        fetchTransactions()
      } else {
        const error = await response.json()
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal melakukan penjualan',
        })
      }
    } catch (error) {
      console.error("Error selling:", error)
      toast({
        title: 'Gagal',
        description: 'Gagal melakukan penjualan',
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

    const link = document.createElement("a")
    link.download = `struk-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error("GAGAL BUAT STRUK PNG:", err)
  }
}

  // EFFECTS
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Sistem Pendataan & Pembukuan</h1>
          <p className="text-muted-foreground">Kelola bahan baku, menu, dan transaksi dengan mudah</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="materials" className="flex items-center gap-2"><Package className="h-4 w-4" /><span className="hidden sm:inline">Bahan Baku</span></TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Menu</span></TabsTrigger>
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
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRawMaterial(null); setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' }) }} className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Bahan Baku</span></Button>
                </DialogTrigger>
                <DialogContent>
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
                    <div><Label>Satuan</Label><Input id="unit" value={rawMaterialForm.unit} onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, unit: e.target.value })} placeholder="kg, liter, dll" /></div>
                    <div className="bg-muted p-3 rounded-lg"><Label>Harga Total</Label><p className="text-2xl font-bold">Rp {((parseFloat(rawMaterialForm.unitPrice) || 0) * (parseFloat(rawMaterialForm.quantity) || 0)).toLocaleString('id-ID')}</p></div>
                    <Button onClick={editingRawMaterial ? handleUpdateRawMaterial : handleAddRawMaterial} className="w-full">{editingRawMaterial ? 'Update' : 'Simpan'}</Button>
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
                        <TableHead className="text-center whitespace-nowrap">Nama</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Harga Satuan</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Jumlah</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Satuan</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Harga Total</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawMaterials.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground whitespace-nowrap">Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai.</TableCell></TableRow>) : rawMaterials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="text-center font-medium whitespace-nowrap">{material.name}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">Rp {material.unitPrice.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">{material.quantity}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">{material.unit}</TableCell>
                          <TableCell className="text-center font-semibold whitespace-nowrap">Rp {material.totalPrice.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => handleEditRawMaterial(material)}><Edit className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="outline" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Hapus Bahan Baku</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus bahan baku "{material.name}"?</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRawMaterial(material.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
              <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingMenu(null); setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] }) }} className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Menu</span></Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <Button onClick={editingMenu ? handleUpdateMenu : handleAddMenu} className="w-full">{editingMenu ? 'Update' : 'Simpan'}</Button>
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
              <CardContent className="space-y-4">
                <Label htmlFor="buyerName" className="font-semibold">Nama Pembeli <span className="text-red-500">*</span></Label>
                <div>
                  <Input
                    id="buyerName"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Masukkan nama pembeli..."
                  />
                </div>

                {/* TAMBAHKAN WRAPPER DIV DISINI */}
                <div className="border rounded-lg overflow-hidden bg-white">
                  {/* Tabel di bungkus overflow-x-auto di dalam */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="p-3 whitespace-nowrap">Menu</th>
                          <th className="p-3 whitespace-nowrap">Ukuran</th>
                          <th className="p-3 text-center whitespace-nowrap">Jumlah</th>
                          <th className="p-3 text-right whitespace-nowrap">Harga</th>
                          <th className="p-3 text-right whitespace-nowrap">Subtotal</th>
                          <th className="p-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-4 text-center text-gray-400 italic">
                              Belum ada item yang dipilih.
                            </td>
                          </tr>
                        ) : (
                          cart.map((item, index) => (
                            <tr key={index} className="border-t hover:bg-gray-50">
                              <td className="p-3 font-medium whitespace-nowrap">{item.menuName}</td>
                              <td className="p-3 whitespace-nowrap"><Badge variant="outline">{item.sizeName}</Badge></td>
                              <td className="p-3 text-center font-mono whitespace-nowrap">{item.qty}</td>
                              <td className="p-3 text-right whitespace-nowrap">Rp {item.price.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-semibold whitespace-nowrap">
                                Rp {(item.price * item.qty).toLocaleString('id-ID')}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                                  onClick={() => { const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart); }}
                                >
                                  X
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div> {/* Penutup border rounded-lg */}
                
                {/* Menampilkan Total Harga Real-time */}
                <div className="flex justify-end">
                  <div className="p-3 bg-white border rounded-md text-right min-w-[200px]">
                    <span className="text-sm text-gray-500 block">Total Bayar:</span>
                    <div className="text-xl font-bold text-blue-600">
                      Rp {cart.reduce((total, item) => total + (item.price * item.qty), 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* TOMBOL AKSI (BERUBAH BERDASARKAN MODE) */}
                <div className="flex justify-end gap-4 pt-2">
                  
                  {/* JIKA MODE TUNAI */}
                  {transactionMode === 'cash' && (
                    <Button 
                      onClick={handleProcessTransaction} 
                      disabled={cart.length === 0 || !buyerName} 
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Proses & Cetak
                    </Button>
                  )}

                  {/* JIKA MODE PRE-ORDER */}
                  {transactionMode === 'preorder' && (
                    <Button 
                      onClick={handleSaveAsPreOrder} 
                      disabled={cart.length === 0 || !buyerName} 
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Simpan Pre-Order
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={() => { setCart([]); setBuyerName(""); }} 
                    disabled={cart.length === 0}
                  >
                    Reset Form
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* DAFTAR PRE-ORDER */}
            {savedPreOrders.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
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
                      <Card key={po.id} className="border-l-4 border-l-yellow-500 relative">
                        <CardHeader className="bg-yellow-50">
                          <div className="flex justify-between">
                            <CardTitle className="text-base">{po.buyerName}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {new Date(po.createdAt).toLocaleString('id-ID')}
                            </Badge>
                          </div>
                          <CardDescription>
                            {cartItems.length} item
                          </CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="border rounded bg-white">
                            <table className="w-full">
                              <tbody>
                                {cartItems.map((c, idx) => (
                                  <tr key={idx}>
                                    <td className="p-2">{c.menuName}</td>
                                    <td className="p-2">Rp. {c.price.toLocaleString('id-ID')}</td>
                                    <td className="p-2 text-right">x{c.qty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-2 text-right">
                              <span className="font-semibold">Total: </span>
                              <span className="text-gray-700">Rp. {po.totalAmount.toLocaleString('id-ID')}</span>
                            </div>
                          <div className="flex justify-end gap-2 mt-4">                              
                            <Button
                              onClick={() => handleProcessSavedOrder(po)}
                              disabled={po.status === 'taken'}
                            >
                              Proses Pre-Order
                            </Button>
                            <Button onClick={() => handleDeletePreOrder(po.id)} variant="outline" size="sm"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.length === 0 ? (<div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">Belum ada menu. Klik "Tambah Menu" untuk memulai.</div>) : menus.map((menu) => (
                <Card key={menu.id} className="overflow-hidden">
                  <div className="relative h-48 bg-muted">
                    {menu.image ? (<img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground" /></div>)}
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{menu.name}</CardTitle>
                    <CardDescription>{menu.sizes.length} {menu.sizes.length > 1 ? 'ukuran' : 'ukuran'} tersedia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {menu.sizes.map((size) => (
                        <div key={size.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border shadow-sm">
                          <div className="flex items-center gap-2">
                            Ukuran : <Badge variant="secondary">{size.size}</Badge>
                            <span className="font-semibold text-gray-700">Harga : Rp {size.price.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium ${size.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>Stok: {size.stock}</span>
                            <Button size="sm" className="h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700" onClick={() => addToCart(menu, size)} disabled={size.stock <= 0}><Plus className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditMenu(menu)} className="flex-1"><Edit className="h-4 w-4 mr-2" /> Edit Menu</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus Menu</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus menu "{menu.name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMenu(menu.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB TRANSAKSI */}
          <TabsContent value="transactions" className="space-y-6">
            <div><h2 className="text-2xl font-bold mb-2">Riwayat Transaksi</h2><p className="text-muted-foreground">Lihat semua transaksi pemasukan dan pengeluaran</p></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">Rp {totalIncome.toLocaleString('id-ID')}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle><TrendingDown className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">Rp {totalExpense.toLocaleString('id-ID')}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Item Terjual</CardTitle><ShoppingCart className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalSales} item</div></CardContent></Card>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 border-b"><CardTitle>Riwayat Transaksi</CardTitle></div>
              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                        <TableHead className="whitespace-nowrap">Tipe</TableHead>
                        <TableHead className="whitespace-nowrap">Deskripsi</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Jumlah</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (<TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground whitespace-nowrap">Belum ada transaksi.</TableCell></TableRow>) : transactions.map((transaction) => (
                        <React.Fragment key={transaction.id}>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="whitespace-nowrap"><div className="flex items-center gap-2">{formatDate(transaction.date)}</div></TableCell>
                            <TableCell className="whitespace-nowrap"><Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>{transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</Badge></TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="max-w-[300px]">
                                <p className="font-medium truncate" title={transaction.description}>{transaction.description || '-'}</p>
                                {transaction.salesHeaderId && transaction.salesHeader.buyerName && (<p className="text-xs text-muted-foreground mt-1">Pembeli: {transaction.salesHeader.buyerName}</p>)}
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-semibold whitespace-nowrap ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>{transaction.type === 'INCOME' ? '+' : '-'} Rp {transaction.amount.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                {transaction.type === 'INCOME' && transaction.salesHeaderId && (<Button variant="outline" size="sm" onClick={() => handleEditTransactionClick(transaction.salesHeaderId || transaction.id)}><Edit className="h-4 w-4" /></Button>)}
                                {transaction.type === 'INCOME' && transaction.salesHeader && (<Button variant="outline" size="sm" onClick={() => handlePrintTransaction(transaction)}><Printer className="h-4 w-4" /></Button>)}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Hapus Transaksi</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus transaksi ini?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>Hapus</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
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
                              <TableCell className="whitespace-nowrap"><Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>{transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}</Badge></TableCell>
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

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Transaksi</DialogTitle><DialogDescription>Ubah item atau jumlah pembelian. Stok akan otomatis disesuaikan.</DialogDescription></DialogHeader>
          {editingTransactionData && (
            <div className="space-y-4">
              <Label>Nama Pembeli</Label>
              <Input value={editingTransactionData.buyerName} disabled className="bg-gray-100" />
              <div className="border rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-3">Menu</th>
                      <th className="p-3">Ukuran</th>
                      <th className="p-3 text-center">Jumlah</th>
                      <th className="p-3 text-right">Harga</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editCart.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{item.menuName}</td>
                        <td className="p-3"><Badge variant="outline">{item.sizeName}</Badge></td>
                        <td className="p-3 text-center">
                          <Input type="number" min="1" className="w-16 text-center" value={item.qty} onChange={(e) => { const newCart = [...editCart]; newCart[index].qty = parseInt(e.target.value); setEditCart(newCart); }} />
                        </td>
                        <td className="p-3 text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right font-semibold">Rp {(item.price * item.qty).toLocaleString('id-ID')}</td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { const newCart = [...editCart]; newCart.splice(index, 1); setEditCart(newCart); }}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold">Total: Rp {editCart.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString('id-ID')}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditTransactionOpen(false)}>Batal</Button>
                  <Button onClick={handleUpdateTransaction} className="bg-blue-600 hover:bg-blue-700">Simpan Perubahan</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printData && (
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <ReceiptPreview ref={receiptRef} data={printData} />
        </div>
      )}
    </div>
  )
}