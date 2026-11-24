import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { EstadoCarga } from './EstadoCarga.tsx';
import { EstadoError } from './EstadoError.tsx';

export function QrCita({ token, etiqueta = 'Código QR de la cita' }: { token: string; etiqueta?: string }) {
  const qr = useQuery({ queryKey: ['qr', token], queryFn: () => QRCode.toString(token, { type: 'svg', width: 224, margin: 2, color: { dark: '#163c31', light: '#ffffff' } }), staleTime: Infinity });
  if (qr.isPending) return <EstadoCarga texto="Preparando el QR…" />;
  if (qr.isError) return <EstadoError error={qr.error} onReintentar={() => { void qr.refetch(); }} />;
  return <div className="qr-cita" role="img" aria-label={etiqueta} dangerouslySetInnerHTML={{ __html: qr.data }} />;
}
