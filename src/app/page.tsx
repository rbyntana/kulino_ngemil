'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Package, Plus, Edit, Trash2, ShoppingCart, FileText, Wallet, TrendingUp, TrendingDown, Download, Calendar as CalendarIcon, Image as ImageIcon } from 'lucide-react'

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

  // Helper function to format date consistently as DD/MM/YYYY using UTC
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Use UTC methods to avoid timezone issues
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

export default function Home() {
  const [activeTab, setActiveTab] = useState('materials')
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalSales, setTotalSales] = useState(0)

  // Raw material form
  const [rawMaterialForm, setRawMaterialForm] = useState({
    name: '',
    unitPrice: '',
    quantity: '',
    unit: ''
  })
  const [editingRawMaterial, setEditingRawMaterial] = useState<RawMaterial | null>(null)
  const [isRawMaterialDialogOpen, setIsRawMaterialDialogOpen] = useState(false)

  // Menu form
  const [menuForm, setMenuForm] = useState({
    name: '',
    image: '',
    sizes: [{ size: '', price: '', stock: '' }]
  })
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false)
  const [selectedMenuForSell, setSelectedMenuForSell] = useState<Menu | null>(null)
  const [selectedSizeForSell, setSelectedSizeForSell] = useState<Size | null>(null)
  const [sellQuantity, setSellQuantity] = useState(1)

  // Date filter for reports
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  // Report preview data
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

  useEffect(() => {
    fetchRawMaterials()
    fetchMenus()
    fetchTransactions()
  }, [])

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials')
      const data = await response.json()
      setRawMaterials(data)
    } catch (error) {
      console.error('Error fetching raw materials:', error)
      toast.error('Gagal memuat bahan baku')
    }
  }

  const fetchMenus = async () => {
    try {
      const response = await fetch('/api/menus')
      const data = await response.json()
      setMenus(data)
    } catch (error) {
      console.error('Error fetching menus:', error)
      toast.error('Gagal memuat menu')
    }
  }

  const fetchTransactions = async () => {
    try {
      // Don't use date filters when fetching transactions for transactions tab
      // This ensures ALL transactions are shown regardless of report date settings
      const response = await fetch('/api/transactions')
      const data = await response.json()
      setTransactions(data.transactions)
      setTotalIncome(data.totalIncome || 0)
      setTotalExpense(data.totalExpense || 0)
      setTotalSales(data.salesCount || 0)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Gagal memuat transaksi')
    }
  }

  // Raw material handlers
  const handleAddRawMaterial = async () => {
    if (!rawMaterialForm.name || !rawMaterialForm.unitPrice || !rawMaterialForm.quantity || !rawMaterialForm.unit) {
      toast.error('Mohon isi semua kolom')
      return
    }

    try {
      const response = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawMaterialForm)
      })

      if (response.ok) {
        toast.success('Bahan baku berhasil ditambahkan')
        setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
        setIsRawMaterialDialogOpen(false)
        fetchRawMaterials()
        fetchTransactions()
      } else {
        toast.error('Gagal menambahkan bahan baku')
      }
    } catch (error) {
      console.error('Error adding raw material:', error)
      toast.error('Gagal menambahkan bahan baku')
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

      if (response.ok) {
        toast.success('Bahan baku berhasil diperbarui')
        setEditingRawMaterial(null)
        setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
        setIsRawMaterialDialogOpen(false)
        fetchRawMaterials()
        fetchTransactions()
      } else {
        toast.error('Gagal memperbarui bahan baku')
      }
    } catch (error) {
      console.error('Error updating raw material:', error)
      toast.error('Gagal memperbarui bahan baku')
    }
  }

  const handleDeleteRawMaterial = async (id: string) => {
    try {
      const response = await fetch(`/api/raw-materials?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Bahan baku berhasil dihapus')
        fetchRawMaterials()
      } else {
        toast.error('Gagal menghapus bahan baku')
      }
    } catch (error) {
      console.error('Error deleting raw material:', error)
      toast.error('Gagal menghapus bahan baku')
    }
  }

  // Menu handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setMenuForm({ ...menuForm, image: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddMenuSize = () => {
    setMenuForm({
      ...menuForm,
      sizes: [...menuForm.sizes, { size: '', price: '', stock: '' }]
    })
  }

  const handleRemoveMenuSize = (index: number) => {
    const newSizes = menuForm.sizes.filter((_, i) => i !== index)
    setMenuForm({ ...menuForm, sizes: newSizes })
  }

  const handleMenuSizeChange = (index: number, field: string, value: string) => {
    const newSizes = [...menuForm.sizes]
    newSizes[index] = { ...newSizes[index], [field]: value }
    setMenuForm({ ...menuForm, sizes: newSizes })
  }

  const handleAddMenu = async () => {
    if (!menuForm.name || !menuForm.image || menuForm.sizes.length === 0) {
      toast.error('Mohon isi semua kolom dan minimal satu ukuran')
      return
    }

    const hasInvalidSize = menuForm.sizes.some(s => !s.size || !s.price || !s.stock)
    if (hasInvalidSize) {
      toast.error('Mohon isi semua kolom ukuran')
      return
    }

    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuForm)
      })

      if (response.ok) {
        toast.success('Menu berhasil ditambahkan')
        setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] })
        setIsMenuDialogOpen(false)
        fetchMenus()
      } else {
        toast.error('Gagal menambahkan menu')
      }
    } catch (error) {
      console.error('Error adding menu:', error)
      toast.error('Gagal menambahkan menu')
    }
  }

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu)
    setMenuForm({
      name: menu.name,
      image: menu.image,
      sizes: menu.sizes.map(s => ({
        size: s.size,
        price: s.price.toString(),
        stock: s.stock.toString()
      }))
    })
    setIsMenuDialogOpen(true)
  }

  const handleUpdateMenu = async () => {
    if (!editingMenu) return

    try {
      const response = await fetch('/api/menus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMenu.id,
          ...menuForm
        })
      })

      if (response.ok) {
        toast.success('Menu berhasil diperbarui')
        setEditingMenu(null)
        setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] })
        setIsMenuDialogOpen(false)
        fetchMenus()
      } else {
        toast.error('Gagal memperbarui menu')
      }
    } catch (error) {
      console.error('Error updating menu:', error)
      toast.error('Gagal memperbarui menu')
    }
  }

  const handleDeleteMenu = async (id: string) => {
    try {
      const response = await fetch(`/api/menus?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Menu berhasil dihapus')
        fetchMenus()
      } else {
        toast.error('Gagal menghapus menu')
      }
    } catch (error) {
      console.error('Error deleting menu:', error)
      toast.error('Gagal menghapus menu')
    }
  }

  // Sell handlers
  const handleSellClick = (menu: Menu) => {
    setSelectedMenuForSell(menu)
    setSelectedSizeForSell(null)
    setSellQuantity(1)
    setIsSellDialogOpen(true)
  }

  const handleSell = async () => {
    if (!selectedMenuForSell || !selectedSizeForSell) {
      toast.error('Mohon pilih menu dan ukuran')
      return
    }

    if (sellQuantity > selectedSizeForSell.stock) {
      toast.error('Stok tidak mencukupi')
      return
    }

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId: selectedMenuForSell.id,
          sizeId: selectedSizeForSell.id,
          quantity: sellQuantity
        })
      })

      if (response.ok) {
        toast.success('Penjualan berhasil')
        setIsSellDialogOpen(false)
        setSelectedMenuForSell(null)
        setSelectedSizeForSell(null)
        setSellQuantity(1)
        fetchMenus()
        fetchTransactions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal melakukan penjualan')
      }
    } catch (error) {
      console.error('Error selling:', error)
      toast.error('Gagal melakukan penjualan')
    }
  }

  // Transaction handlers
  const handleDeleteTransaction = async (id: string) => {
    if (!id) {
      toast.error('ID transaksi tidak valid')
      return
    }

    try {
      console.log('Deleting transaction with ID:', id)

      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      })

      console.log('Delete response status:', response.status)

      if (response.ok) {
        toast.success('Transaksi berhasil dihapus')
        await fetchTransactions()
        await fetchMenus()
      } else {
        const errorText = await response.text()
        console.error('Delete failed:', errorText)
        toast.error(`Gagal menghapus transaksi: ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('Gagal menghapus transaksi')
    }
  }

  // Report handlers
  const handlePreviewReport = async () => {
    setIsPreviewLoading(true)
    try {
      // Format dates as YYYY-MM-DD using LOCAL methods (not UTC)
      // Because user selects Dec 29 in Indonesia (GMT+7), we want to send 2025-12-29
      const formatDateUTC = (date: Date | undefined) => {
        if (!date) return '';
        // Use LOCAL methods to get what user actually selected
        const year = date.getFullYear();        // 2025
        const month = String(date.getMonth() + 1).padStart(2, '0');  // 12
        const day = String(date.getDate()).padStart(2, '0');    // 29
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDateUTC(startDate)
      const endDateStr = formatDateUTC(endDate)

      console.log('=== FRONTEND PREVIEW REPORT ===');
      console.log('Selected startDate (JS Date):', startDate);
      console.log('Selected endDate (JS Date):', endDate);
      console.log('Formatted startDate (string):', startDateStr);
      console.log('Formatted endDate (string):', endDateStr);
      console.log('Sending to API:', `/api/reports/preview?startDate=${startDateStr}&endDate=${endDateStr}`);

      const response = await fetch(`/api/reports/preview?startDate=${startDateStr}&endDate=${endDateStr}`)

      if (response.ok) {
        const data = await response.json()
        setReportPreview(data)
        toast.success('Preview laporan berhasil dimuat')
      } else {
        toast.error('Gagal memuat preview laporan')
        setReportPreview(null)
      }
    } catch (error) {
      console.error('Error fetching report preview:', error)
      toast.error('Gagal memuat preview laporan')
      setReportPreview(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      // Format dates as YYYY-MM-DD using LOCAL methods
      // Because user selects Dec 29 in Indonesia (GMT+7), we want to send 2025-12-29
      const formatDateUTC = (date: Date | undefined) => {
        if (!date) return '';
        // Use LOCAL methods to get what user actually selected
        const year = date.getFullYear();        // 2025
        const month = String(date.getMonth() + 1).padStart(2, '0');  // 12
        const day = String(date.getDate()).padStart(2, '0');    // 29
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDateUTC(startDate)
      const endDateStr = formatDateUTC(endDate)

      const response = await fetch(`/api/reports?startDate=${startDateStr}&endDate=${endDateStr}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'laporan-penjualan.pdf'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Laporan berhasil diunduh')
      } else {
        toast.error('Gagal mengunduh laporan')
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Gagal mengunduh laporan')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Sistem Pendataan & Pembukuan</h1>
          <p className="text-muted-foreground">Kelola bahan baku, menu, dan transaksi dengan mudah</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Bahan Baku</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Transaksi</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Laporan</span>
            </TabsTrigger>
          </TabsList>

          {/* Raw Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Bahan Baku</h2>
                <p className="text-muted-foreground">Kelola bahan baku untuk produk Anda</p>
              </div>
              <Dialog open={isRawMaterialDialogOpen} onOpenChange={setIsRawMaterialDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingRawMaterial(null)
                    setRawMaterialForm({ name: '', unitPrice: '', quantity: '', unit: '' })
                  }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Tambah Bahan Baku</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRawMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle>
                    <DialogDescription>
                      {editingRawMaterial ? 'Edit detail bahan baku' : 'Masukkan detail bahan baku baru'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nama Bahan Baku</Label>
                      <Input
                        id="name"
                        value={rawMaterialForm.name}
                        onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, name: e.target.value })}
                        placeholder="Contoh: Tepung Terigu"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="unitPrice">Harga Satuan (Rp)</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          value={rawMaterialForm.unitPrice}
                          onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, unitPrice: e.target.value })}
                          placeholder="10000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Jumlah/Kuantitas</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={rawMaterialForm.quantity}
                          onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, quantity: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="unit">Satuan</Label>
                      <Input
                        id="unit"
                        value={rawMaterialForm.unit}
                        onChange={(e) => setRawMaterialForm({ ...rawMaterialForm, unit: e.target.value })}
                        placeholder="kg, liter, dll"
                      />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Label>Harga Total</Label>
                      <p className="text-2xl font-bold">
                        Rp {((parseFloat(rawMaterialForm.unitPrice) || 0) * (parseFloat(rawMaterialForm.quantity) || 0)).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Button
                      onClick={editingRawMaterial ? handleUpdateRawMaterial : handleAddRawMaterial}
                      className="w-full"
                    >
                      {editingRawMaterial ? 'Update' : 'Simpan'}
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
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground whitespace-nowrap">
                            Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawMaterials.map((material) => (
                          <TableRow key={material.id}>
                            <TableCell className="text-center font-medium whitespace-nowrap">{material.name}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">Rp {material.unitPrice.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">{material.quantity}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">{material.unit}</TableCell>
                            <TableCell className="text-center font-semibold whitespace-nowrap">Rp {material.totalPrice.toLocaleString('id-ID')}</TableCell>
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
                                        Tindakan ini tidak dapat dibatalkan.
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

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Menu</h2>
                <p className="text-muted-foreground">Kelola menu produk Anda</p>
              </div>
              <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingMenu(null)
                    setMenuForm({ name: '', image: '', sizes: [{ size: '', price: '', stock: '' }] })
                  }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Tambah Menu</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</DialogTitle>
                    <DialogDescription>
                      {editingMenu ? 'Edit detail menu' : 'Masukkan detail menu baru'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="menuName">Nama Menu</Label>
                      <Input
                        id="menuName"
                        value={menuForm.name}
                        onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                        placeholder="Contoh: Ayam Bakar"
                      />
                    </div>
                    <div>
                      <Label htmlFor="menuImage">Gambar Menu</Label>
                      <div className="flex items-center gap-4">
                        {menuForm.image && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden border">
                            <img src={menuForm.image} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <Input
                            id="menuImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Ukuran & Harga</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddMenuSize}>
                          <Plus className="h-4 w-4 mr-1" />
                          Tambah Ukuran
                        </Button>
                      </div>
                      {menuForm.sizes.map((size, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
                          <div className="col-span-4">
                            <Label htmlFor={`size-${index}`} className="text-xs">Ukuran</Label>
                            <Input
                              id={`size-${index}`}
                              value={size.size}
                              onChange={(e) => handleMenuSizeChange(index, 'size', e.target.value)}
                              placeholder="250gr"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor={`price-${index}`} className="text-xs">Harga</Label>
                            <Input
                              id={`price-${index}`}
                              type="number"
                              value={size.price}
                              onChange={(e) => handleMenuSizeChange(index, 'price', e.target.value)}
                              placeholder="15000"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label htmlFor={`stock-${index}`} className="text-xs">Stok</Label>
                            <Input
                              id={`stock-${index}`}
                              type="number"
                              value={size.stock}
                              onChange={(e) => handleMenuSizeChange(index, 'stock', e.target.value)}
                              placeholder="10"
                            />
                          </div>
                          <div className="col-span-2">
                            {menuForm.sizes.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMenuSize(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={editingMenu ? handleUpdateMenu : handleAddMenu}
                      className="w-full"
                    >
                      {editingMenu ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  Belum ada menu. Klik "Tambah Menu" untuk memulai.
                </div>
              ) : (
                menus.map((menu) => (
                  <Card key={menu.id} className="overflow-hidden">
                    <div className="relative h-48 bg-muted">
                      {menu.image ? (
                        <img
                          src={menu.image}
                          alt={menu.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{menu.name}</CardTitle>
                      <CardDescription>
                        {menu.sizes.length} {menu.sizes.length > 1 ? 'ukuran' : 'ukuran'} tersedia
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {menu.sizes.map((size) => (
                          <div key={size.id} className="flex justify-between items-center text-sm">
                            <Badge variant="outline">{size.size}</Badge>
                            <span className="font-semibold">Rp {size.price.toLocaleString('id-ID')}</span>
                            <span className={`text-xs ${size.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stok: {size.stock}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSellClick(menu)}
                          className="flex-1"
                          size="sm"
                          disabled={menu.sizes.every(s => s.stock === 0)}
                        >
                          Jual
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMenu(menu)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Menu</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus menu "{menu.name}"? Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMenu(menu.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Riwayat Transaksi</h2>
              <p className="text-muted-foreground">Lihat semua transaksi pemasukan dan pengeluaran</p>
            </div>

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
                  <div className="text-2xl font-bold">
                    {totalSales} item
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <CardTitle>Riwayat Transaksi</CardTitle>
              </div>
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
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground whitespace-nowrap">
                            Belum ada transaksi.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(transaction.date)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>
                                {transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={transaction.description}>
                              {transaction.description}
                            </TableCell>
                            <TableCell className={`text-right font-semibold whitespace-nowrap ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'INCOME' ? '+' : '-'}
                              Rp {transaction.amount.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus transaksi ini? Jika ini transaksi penjualan, stok akan dikembalikan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Laporan Penjualan</h2>
              <p className="text-muted-foreground">Generate dan ekspor laporan penjualan</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filter Laporan</CardTitle>
                <CardDescription>Pilih rentang tanggal untuk laporan yang ingin dilihat</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP', { locale: undefined }) : 'Pilih tanggal'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Tanggal Akhir</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP', { locale: undefined }) : 'Pilih tanggal'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handlePreviewReport} disabled={isPreviewLoading} className="gap-2">
                    {isPreviewLoading ? 'Memuat...' : (
                      <>
                        <FileText className="h-4 w-4" />
                        Preview Laporan
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setStartDate(undefined)
                    setEndDate(undefined)
                    setReportPreview(null)
                    fetchTransactions()
                  }}>
                    Reset Filter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {reportPreview && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Ringkasan Laporan</CardTitle>
                    <CardDescription>
                      Periode: {reportPreview.dateRange.startDate ? reportPreview.dateRange.startDate : 'Awal'} - {reportPreview.dateRange.endDate ? reportPreview.dateRange.endDate : 'Sekarang'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Pemasukan</p>
                        <p className="text-2xl font-bold text-green-600">
                          Rp {reportPreview.totalIncome.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Pengeluaran</p>
                        <p className="text-2xl font-bold text-red-600">
                          Rp {reportPreview.totalExpense.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Pendapatan Bersih</p>
                        <p className={`text-2xl font-bold ${reportPreview.totalIncome - reportPreview.totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rp {(reportPreview.totalIncome - reportPreview.totalExpense).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Item Terjual</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {reportPreview.totalSales} item
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 border-b bg-muted">
                    <h3 className="font-semibold">Riwayat Transaksi</h3>
                  </div>
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
                          {reportPreview.transactions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                Tidak ada transaksi dalam periode ini
                              </TableCell>
                            </TableRow>
                          ) : (
                            reportPreview.transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(transaction.date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>
                                    {transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap max-w-[200px] truncate" title={transaction.description}>
                                  {transaction.description}
                                </TableCell>
                                <TableCell className={`text-right font-semibold whitespace-nowrap ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.type === 'INCOME' ? '+' : '-'}
                                  Rp {transaction.amount.toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 border-b bg-muted">
                    <h3 className="font-semibold">Riwayat Penjualan</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                            <TableHead className="whitespace-nowrap">Menu</TableHead>
                            <TableHead className="whitespace-nowrap">Ukuran</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Harga</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Qty</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportPreview.sales.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                Tidak ada penjualan dalam periode ini
                              </TableCell>
                            </TableRow>
                          ) : (
                            reportPreview.sales.map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(sale.date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{sale.menu.name}</TableCell>
                                <TableCell className="whitespace-nowrap">{sale.size.size}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">Rp {sale.price.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right whitespace-nowrap">{sale.quantity}</TableCell>
                                <TableCell className="text-right font-semibold whitespace-nowrap">Rp {sale.total.toLocaleString('id-ID')}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={handleExportPDF} className="w-full gap-2" size="lg">
                      <Download className="h-5 w-5" />
                      Export PDF
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sell Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jual Menu</DialogTitle>
            <DialogDescription>Pilih ukuran dan jumlah yang akan dijual</DialogDescription>
          </DialogHeader>
          {selectedMenuForSell && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedMenuForSell.image && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden">
                    <img src={selectedMenuForSell.image} alt={selectedMenuForSell.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{selectedMenuForSell.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMenuForSell.sizes.length} ukuran tersedia</p>
                </div>
              </div>
              <div>
                <Label>Ukuran</Label>
                <Select value={selectedSizeForSell?.id} onValueChange={(value) => {
                  const size = selectedMenuForSell?.sizes.find(s => s.id === value)
                  setSelectedSizeForSell(size || null)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ukuran" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedMenuForSell.sizes.map((size) => (
                      <SelectItem
                        key={size.id}
                        value={size.id}
                        disabled={size.stock === 0}
                      >
                        {size.size} - Rp {size.price.toLocaleString('id-ID')} (Stok: {size.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSizeForSell && (
                <div>
                  <Label>Jumlah</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedSizeForSell.stock}
                    value={sellQuantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSellQuantity(value === "" ? "" : Number(value));
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Total: Rp {(selectedSizeForSell.price * sellQuantity).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              <Button onClick={handleSell} className="w-full" disabled={!selectedSizeForSell}>
                Konfirmasi Penjualan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
