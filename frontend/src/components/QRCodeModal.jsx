import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, ShieldCheck } from 'lucide-react';

const QRCodeModal = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  // Data to encode in QR: Readable string for better scannability
  const qrData = `BIT BUS PASS | ID: ${booking.bookingId || booking._id} | BUS: ${booking.busName} | SEAT: ${booking.seatNumber} | DATE: ${booking.travelDate}`;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <style>{`
        .qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .qr-modal-content {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 400px;
          padding: 32px;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .qr-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #f1f5f9;
          border: none;
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        .qr-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .qr-header {
          text-align: center;
        }
        .qr-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .qr-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }
        .qr-container {
          padding: 20px;
          background: #f8fafc;
          border-radius: 20px;
          border: 2px solid #eff6ff;
        }
        .qr-details {
          width: 100%;
          background: #f8fafc;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .qr-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .qr-detail-label {
          color: #64748b;
          font-weight: 500;
        }
        .qr-detail-value {
          color: #0f172a;
          font-weight: 700;
        }
        .qr-verify-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          padding: 4px 12px;
          border-radius: 100px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="qr-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="qr-header">
          <h3 className="qr-title">Boarding Pass</h3>
          <p className="qr-subtitle">Scan at the bus entrance</p>
        </div>

        <div className="qr-container">
          <QRCodeSVG 
            value={qrData} 
            size={250}
            level="M"
            includeMargin={true}
          />
        </div>

        <div className="qr-verify-badge">
          <ShieldCheck size={14} />
          Verified BIT Ticket
        </div>

        <div className="qr-details">
          <div className="qr-detail-row">
            <span className="qr-detail-label">Bus</span>
            <span className="qr-detail-value">{booking.busName}</span>
          </div>
          <div className="qr-detail-row">
            <span className="qr-detail-label">Seat</span>
            <span className="qr-detail-value">Seat {booking.seatNumber}</span>
          </div>
          <div className="qr-detail-row">
            <span className="qr-detail-label">Date</span>
            <span className="qr-detail-value">{booking.travelDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
