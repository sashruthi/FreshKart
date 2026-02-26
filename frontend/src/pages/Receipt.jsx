import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Receipt.css';

export default function Receipt() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const receiptRef = useRef(null);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!state && typeof window !== 'undefined') {
            const timer = setTimeout(() => navigate('/cart', { replace: true }), 1600);
            return () => clearTimeout(timer);
        }
    }, [state, navigate]);

    if (!state) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>No receipt data found.</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Redirecting to cart...</p>
            <button onClick={() => navigate('/cart')} style={{ padding: '10px 20px', background: '#0b74de', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go to Cart Now</button>
        </div>
    );

    const { items = [], total, date, orderId, user, address = '', phone = '', name = '' } = state;

    function tidyAddress(addr) {
        if (!addr) return 'Address not provided';
        const s = String(addr).trim();
        const lower = s.toLowerCase();
        if (!s || lower === 'n/a' || lower === 'na' || lower === 'none' || lower.includes('null') || lower.includes('undefined') || /^0+$/.test(s)) return 'Address not provided';
        if (s.length < 8 || /^[0-9.,\\-\\s]+$/.test(s)) return 'Address not provided';
        return s;
    }

    // Calculate GST and totals
    const gstBreakdown = {};
    let subtotal = 0;
    items.forEach(it => {
        const gstRate = Number(it.gst_percent) || 0;
        const price = Number(it.price) || 0;
        const qty = Number(it.quantity || 0);

        const lineTotal = price * qty;
        const lineNetTotal = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
        const lineGstTotal = Math.round((lineTotal - lineNetTotal) * 100) / 100;

        const key = gstRate.toFixed(2);
        if (!gstBreakdown[key]) gstBreakdown[key] = { subtotal: 0, gst: 0 };
        gstBreakdown[key].subtotal += lineNetTotal;
        gstBreakdown[key].gst += lineGstTotal;
        subtotal += lineNetTotal;
    });
    const totalGST = Object.values(gstBreakdown).reduce((s, it) => s + it.gst, 0);
    const finalTotal = subtotal + totalGST;
    const shopName = items[0]?.merchant_name || 'Fresh Mart';

    async function handlePayment(method) {
        if (!method) return setError('Select a payment method');
        setProcessing(true);
        setError(null);
        try {
            const payload = { orderId, amount: finalTotal, paymentMethod: method, user_id: user?.id };
            const response = await api.post('/payments', payload);
            if (response?.status === 200 || response?.data?.success) {
                setPaymentSuccess(true);
            } else {
                setError('Payment failed');
            }
        } catch (err) {
            setError(err?.response?.data?.error || `Payment failed: ${err?.message || err}`);
        } finally {
            setProcessing(false);
        }
    }

    function handlePrint() {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !receiptRef.current) return;
        printWindow.document.write(buildReceiptHtml());
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); printWindow.close(); };
    }

    function handleDownload() {
        if (!receiptRef.current) return;
        const html = buildReceiptHtml();
        const element = document.createElement('div');
        element.innerHTML = html;

        const opt = {
            margin: 10,
            filename: `receipt-IN-${orderId || 'order'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().from(element).set(opt).save();
    }

    function buildReceiptHtml() {
        const receiptHtml = receiptRef.current?.outerHTML || '';
        const styles = `
            html, body { margin: 0; padding: 0; background: #f5f5f5; }
            body { padding: 24px; font-family: 'Courier New', monospace; color: #111; }
            .receipt-card { background: #fff; padding: 32px; max-width: 900px; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 8px; }
            thead tr { border-bottom: 1px solid #eee; }
            tbody tr { border-bottom: 1px solid #f3f3f3; }
        `;
        return `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt IN-${orderId || 'order'}</title><style>${styles}</style></head><body>${receiptHtml}</body></html>`;
    }

    const ReceiptContent = () => (
        <div ref={receiptRef} className="receipt-card" style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{shopName}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Quality Grocery & Fresh Produce</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ fontSize: '13px' }}>
                    <div><strong>Bill No:</strong> IN-{orderId}</div>
                    <div><strong>Date:</strong> {new Date(date || Date.now()).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: '13px', textAlign: 'right' }}>
                    <div><strong>Customer:</strong> {name}</div>
                    <div><strong>Phone:</strong> {phone}</div>
                    <div><strong>Address:</strong> {tidyAddress(address)}</div>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                        <th style={{ padding: '8px' }}>SNo</th>
                        <th style={{ padding: '8px' }}>Item</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Net</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>GST%</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>GST</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((it, idx) => {
                        const gstRate = Number(it.gst_percent) || 0;
                        const price = Number(it.price) || 0;
                        const qty = Number(it.quantity || 0);

                        const lineTotal = price * qty;
                        const lineNetTotal = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
                        const lineGstTotal = Math.round((lineTotal - lineNetTotal) * 100) / 100;
                        const basePrice = qty > 0 ? lineNetTotal / qty : 0;

                        return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f3f3' }}>
                                <td style={{ padding: '8px' }}>{idx + 1}</td>
                                <td style={{ padding: '8px' }}>{it.name}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>₹{basePrice.toFixed(2)}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{qty}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{gstRate.toFixed(2)}%</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>₹{lineGstTotal.toFixed(2)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>₹{lineTotal.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px' }}>
                    {Object.entries(gstBreakdown).map(([rate, val]) => (
                        <div key={rate}>GST {Number(rate)}% — ₹{(val.gst).toFixed(2)}</div>
                    ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>₹{finalTotal.toFixed(2)}</div>
                </div>
            </div>
        </div>
    );

    if (paymentSuccess) {
        return (
            <div style={{ padding: 20, maxWidth: 800, margin: '20px auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 48, color: '#27ae60' }}>✓</div>
                    <h2>Payment Successful!</h2>
                    <p>Your order has been placed successfully.</p>
                </div>
                <ReceiptContent />
                <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button onClick={handlePrint} style={{ padding: '10px 20px', background: '#34495e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Print</button>
                    <button onClick={handleDownload} style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Download PDF</button>
                    <button
                        onClick={() => {
                            const mid = state?.merchantId || items?.[0]?.merchant_id;
                            navigate(mid ? `/merchant/${mid}` : '/daily-needs');
                        }}
                        style={{ padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <ReceiptContent />

                <div style={{ marginTop: 18, padding: 18, background: '#fff', borderRadius: 8 }}>
                    <h3 style={{ textAlign: 'center' }}>Select Payment Method</h3>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
                        <button onClick={() => setPaymentMethod('upi')} style={{ padding: '12px 18px' }}>📱 UPI</button>
                        <button onClick={() => setPaymentMethod('cod')} style={{ padding: '12px 18px' }}>💵 COD</button>
                    </div>

                    <p style={{ textAlign: 'center', marginTop: 12 }}>Payment Method: <strong>{paymentMethod === 'upi' ? 'UPI Payment' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'None'}</strong></p>

                    {error && <div style={{ background: '#fdecea', color: '#611a15', padding: 10, borderRadius: 6 }}>{error}</div>}

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                        <button onClick={() => handlePayment(paymentMethod)} disabled={processing} style={{ padding: '10px 16px' }}>{processing ? 'Processing…' : `Pay ₹${finalTotal.toFixed(2)}`}</button>
                        <button onClick={() => setPaymentMethod(null)} disabled={processing} style={{ padding: '10px 16px' }}>Change Method</button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <button
                            onClick={() => navigate('/checkout', { state: { items, name, address, phone, merchantId: state?.merchantId } })}
                            style={{ padding: '8px 12px', background: '#95a5a6', color: '#fff', border: 'none' }}
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
