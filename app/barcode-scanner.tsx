"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

export function BarcodeScanner({ onRead, onClose }: { onRead: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let controls: IScannerControls | undefined;
    let candidate = "";
    let reads = 0;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("هذا الجهاز لا يدعم تشغيل الكاميرا من المتصفح.");
        return;
      }
      try {
        const hints = new Map<DecodeHintType, unknown>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 280,
          tryPlayVideoTimeout: 5000,
        });
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video!,
          (result, _error, scannerControls) => {
            if (cancelled || !result) return;
            const value = result.getText().trim();
            if (!/^\d{6,18}$/.test(value)) return;
            if (candidate !== value) {
              candidate = value;
              reads = 1;
              return;
            }
            reads += 1;
            if (reads < 2) return;
            scannerControls.stop();
            onRead(value);
          },
        );
        if (cancelled) controls.stop();
      } catch (cameraError) {
        const denied = cameraError instanceof DOMException && cameraError.name === "NotAllowedError";
        setError(denied ? "اسمح للموقع باستخدام الكاميرا من إعدادات Safari ثم جرّب مرة ثانية." : "تعذر تشغيل الكاميرا. أغلق الماسح وافتحه مرة ثانية.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      controls?.stop();
      const stream = video.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [onRead]);

  return (
    <div className="scanner-modal" role="dialog" aria-modal="true" aria-label="ماسح الباركود">
      <div className="scanner-top">
        <div><p>باركود المنتجات فقط</p><h2>امسح الباركود</h2></div>
        <button type="button" onClick={onClose} aria-label="إغلاق">×</button>
      </div>
      <div className="camera-frame"><video ref={videoRef} muted playsInline /><span className="camera-guide" /></div>
      {error ? <p className="scanner-error">{error}</p> : <p className="scanner-hint">خلي باركود الخطوط وحده داخل المربع وثبّت التلفون لحظة — رمز QR يتم تجاهله</p>}
    </div>
  );
}
