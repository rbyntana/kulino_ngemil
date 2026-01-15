import React, { forwardRef } from "react"

type ReceiptItem = {
  price: number
  quantity?: number
  qty?: number

  // CASH (dari sales-header-detail)
  menu?: {
    name?: string
  }
  size?: {
    size?: string
  }

  // PRE-ORDER / CART
  menuName?: string
  sizeName?: string
}

type ReceiptData = {
  buyerName?: string
  date?: string
  items?: ReceiptItem[]
  receiptType?: "PRE_ORDER" | "CASH"
}

const ReceiptPreview = forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    if (!data) return null

    const items = data.items ?? []
    const isPreOrder = data.receiptType === "PRE_ORDER"

    const totalAmount = items.reduce((sum, item) => {
      const qty = item.quantity ?? item.qty ?? 1
      return sum + (item.price ?? 0) * qty
    }, 0)

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          padding: "8px",
          fontFamily: "monospace",
          background: "#fff",
          color: "#000",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", borderBottom: "2px dashed black", paddingBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: "bold" }}>
            {isPreOrder ? "STRUK PRE-ORDER" : "STRUK PEMBELIAN"}
          </div>

          {isPreOrder && (
            <div style={{ fontSize: 11, marginTop: 2 }}>
              *Bukti Pemesanan (Belum Dibayar)
            </div>
          )}

          <div style={{ fontSize: 11, marginTop: 4 }}>Kulino Ngemil</div>

          <div style={{ fontSize: 11, marginTop: 4 }}>
            {data.date ? new Date(data.date).toLocaleString("id-ID") : "-"}
          </div>
        </div>

        {/* BUYER */}
        <div style={{ fontSize: 12, marginTop: 6 }}>
          <strong>PELANGGAN:</strong> {data.buyerName || "-"}
        </div>

        {/* ITEMS */}
        <table
          style={{
            width: "100%",
            fontSize: 12,
            marginTop: 6,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="left">Ukuran</th>
              <th align="right">Harga</th>
              <th align="center">Qty</th>
              <th align="right">Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, i) => {
              const qty = item.quantity ?? item.qty ?? 1
              const price = item.price ?? 0
              const subtotal = price * qty

              const menuName =
                item.menu?.name ||
                item.menuName ||
                "-"

              const sizeName =
                item.size?.size ||
                item.sizeName ||
                "-"

              return (
                <tr key={i}>
                  <td>{menuName}</td>
                  <td>{sizeName}</td>
                  <td align="right">{price.toLocaleString("id-ID")}</td>
                  <td align="center">x{qty}</td>
                  <td align="right">{subtotal.toLocaleString("id-ID")}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <hr style={{ borderTop: "1px dashed black", margin: "6px 0" }} />

        {/* TOTAL */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" }}>
          <span>TOTAL</span>
          <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
        </div>

        {/* PREORDER NOTE */}
        {isPreOrder && (
          <div style={{ marginTop: 6, fontSize: 11, textAlign: "center", fontStyle: "italic" }}>
            Pesanan akan diproses setelah pembayaran
          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: "center", fontSize: 11, marginTop: 10 }}>
          Terima kasih 🙏
        </div>
      </div>
    )
  }
)

ReceiptPreview.displayName = "ReceiptPreview"
export default ReceiptPreview