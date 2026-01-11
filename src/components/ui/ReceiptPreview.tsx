import React, { forwardRef } from "react"

type ReceiptItem = {
  price: number
  quantity: number
  menu?: {
    name?: string
  }
  size?: {
    name?: string
  }
}

type ReceiptData = {
  buyerName?: string
  date?: string
  items?: ReceiptItem[]
}

const ReceiptPreview = forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    if (!data) return null

    const items = data.items ?? []

    // ✅ HITUNG TOTAL LANGSUNG DARI ITEM (PALING AMAN)
    const totalAmount = items.reduce(
      (sum, item) =>
        sum + (item.price ?? 0) * (item.quantity ?? 0),
      0
    )

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          padding: "8px",
          fontFamily: "monospace",
          background: "white",
          color: "black",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px dashed black",
            paddingBottom: 6,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: "bold" }}>
            STRUK PEMBELIAN
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Kulino Ngemil
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {data.date
              ? new Date(data.date).toLocaleString("id-ID")
              : "-"}
          </div>
        </div>

        {/* PELANGGAN */}
        <div style={{ fontSize: 12, marginTop: 6 }}>
          <strong>PELANGGAN:</strong> {data.buyerName || "-"}
        </div>

        {/* ITEM */}
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
              <th align="right">Harga</th>
              <th align="center">Qty</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const price = item.price ?? 0
              const qty = item.quantity ?? 0
              const subtotal = price * qty

              return (
                <tr key={i}>
                  <td>
                    {item.menu?.name || "-"}
                    <div style={{ fontSize: 10 }}>
                      {item.size?.name || ""}
                    </div>
                  </td>
                  <td align="right">
                    {price.toLocaleString("id-ID")}
                  </td>
                  <td align="center">x{qty}</td>
                  <td align="right">
                    {subtotal.toLocaleString("id-ID")}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <hr
          style={{
            borderTop: "1px dashed black",
            margin: "6px 0",
          }}
        />

        {/* TOTAL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            fontWeight: "bold",
          }}
        >
          <span>TOTAL</span>
          <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
        </div>

        {/* FOOTER */}
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            marginTop: 10,
          }}
        >
          Terima kasih 🙏
        </div>
      </div>
    )
  }
)

ReceiptPreview.displayName = "ReceiptPreview"
export default ReceiptPreview
