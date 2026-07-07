import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  Ship,
} from 'lucide-react';
import {
  formatFechaDsv,
  getDsvEventLabel,
  getDsvIcon,
  getStatusLabel,
} from '../utils/trackingUi';
import { SHIPMENT_STATUS_LABELS } from '../utils/trackingMappings';

const formatTrackingDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const dateText = new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'America/El_Salvador'
  }).format(date);

  if (!hasTime) return dateText;

  const timeText = new Intl.DateTimeFormat('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/El_Salvador'
  }).format(date);

  return `${dateText}, ${timeText}`;
};

const getDhlHeaderIcon = (statusCode) => {
  const normalized = String(statusCode || '').toLowerCase();
  if (normalized === 'delivered' || normalized === 'ok') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (['rr', 'ic', 'ud', 'cr'].includes(normalized)) return <ShieldCheck size={14} className="text-amber-500" />;
  if (['tr', 'wc', 'df', 'af', 'pl'].includes(normalized)) return <Ship size={14} className="text-blue-500" />;
  if (normalized === 'pu') return <Package size={14} className="text-slate-500" />;
  return <RefreshCw size={14} className="text-slate-400" />;
};

const getDsvEventTimestamp = (event) => (
  event?.eventLastModified
  || event?.eventDateTime
  || event?.eventTime
  || event?.eventDate
  || null
);

const getDsvNormalizedEventTimestamp = (event) => (
  event?.raw?.eventLastModified
  || event?.raw?.eventDateTime
  || event?.raw?.eventTime
  || event?.raw?.eventDate
  || event?.timestamp
  || null
);

export const ShipmentTracker = ({ shipmentData }) => {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [cargoOpen, setCargoOpen] = useState(false);

  const providerId = String(shipmentData?.provider || shipmentData?.source || '').toUpperCase();
  const isDsv = providerId === 'DSV';

  const normalizedEvents = useMemo(() => {
    const events = Array.isArray(shipmentData?.events) ? shipmentData.events : [];
    return [...events].sort((a, b) => {
      const timeA = Date.parse(a?.timestamp || '') || 0;
      const timeB = Date.parse(b?.timestamp || '') || 0;
      return timeB - timeA;
    });
  }, [shipmentData?.events]);

  const latestEvent = normalizedEvents[0] || null;

  if (!shipmentData || (!shipmentData.raw && normalizedEvents.length === 0)) {
    return null;
  }

  if (isDsv) {
    const raw = shipmentData.raw || {};
    const dsvEvents = Array.isArray(raw.events) ? [...raw.events].sort((a, b) => {
      const timeA = Date.parse(getDsvEventTimestamp(a) || '') || 0;
      const timeB = Date.parse(getDsvEventTimestamp(b) || '') || 0;
      return timeB - timeA;
    }) : [];
    const issues = Array.isArray(raw.issues) ? raw.issues : [];
    const statusLabel = SHIPMENT_STATUS_LABELS[raw.status] || raw.status || null;
    const origin = raw?.transport?.originName;
    const destination = raw?.transport?.destinationName;
    const pickupDate = formatFechaDsv(raw?.dateTime?.pickupTime?.date);
    const deliveryDate = formatFechaDsv(raw?.dateTime?.deliveryTime?.date);
    const shipperRef = raw?.references?.find((ref) => ref?.type === 'SHIPPER_REFERENCE')?.value;
    const orderRef = raw?.references?.find((ref) => ref?.type === 'ORDER_NUMBER' && ref?.value !== 'OC')?.value;
    const carrier = raw?.parties?.carrier?.address?.companyName;

    return (
      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tracking DSV</p>
              {raw?.shipmentId && (
                <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{raw.shipmentId}</p>
              )}
              {statusLabel && (
                <p className="text-[11px] font-bold text-emerald-600 uppercase mt-1">{statusLabel}</p>
              )}
              {latestEvent && (
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  Ultimo estado: {getDsvEventLabel(latestEvent.raw || {})}
                </p>
              )}
            </div>
            <div className="text-right">
              {(origin || destination) && (
                <p className="text-[11px] font-black text-slate-700 uppercase">{origin}{' -> '}{destination}</p>
              )}
              {(pickupDate || deliveryDate) && (
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {pickupDate && `Recoleccion: ${pickupDate}`} {pickupDate && deliveryDate ? '-' : ''} {deliveryDate && `Entrega: ${deliveryDate}`}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {carrier && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Transportista: <span className="text-slate-800 font-black">{carrier}</span></div>
            )}
            {raw?.transport?.houseBillNumber && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">House Bill: <span className="text-slate-800 font-black">{raw.transport.houseBillNumber}</span></div>
            )}
            {raw?.transport?.masterBillNumber && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Master Bill: <span className="text-slate-800 font-black">{raw.transport.masterBillNumber}</span></div>
            )}
            {raw?.incoterms?.code && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Incoterm: <span className="text-slate-800 font-black">{raw.incoterms.code}</span></div>
            )}
            {shipperRef && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Referencia shipper: <span className="text-slate-800 font-black">{shipperRef}</span></div>
            )}
            {orderRef && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Orden de compra: <span className="text-slate-800 font-black">{orderRef}</span></div>
            )}
          </div>
        </div>

        {issues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase">
              <AlertTriangle size={12} /> Incidencias reportadas
            </div>
            <div className="mt-2 space-y-2">
              {issues.map((issue, idx) => (
                <div key={idx} className="text-[10px] font-bold text-amber-700">
                  {issue.issueTypeDescription && <span className="font-black">{issue.issueTypeDescription}</span>}
                  {issue.issueReasonDescription && ` - ${issue.issueReasonDescription}`}
                  {issue.issuePointDescription && ` - ${issue.issuePointDescription}`}
                  {issue.issueNotes && `: ${issue.issueNotes}`}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eventos del embarque</p>
            {dsvEvents.length > 1 && (
              <button
                type="button"
                onClick={() => setTimelineOpen((prev) => !prev)}
                className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"
              >
                {timelineOpen ? <><ChevronUp size={12} /> Ocultar historial</> : <><ChevronDown size={12} /> Ver historial</>}
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {(timelineOpen ? dsvEvents : dsvEvents.slice(0, 1)).map((event, idx) => {
              const label = getDsvEventLabel(event);
              const eventDate = formatFechaDsv(getDsvEventTimestamp(event));
              const place = event?.location?.place;
              const country = event?.location?.countryCode;
              const locationText = [place, country].filter(Boolean).join(' - ');
              const seaInfo = event?.transportMode === 'Sea'
                ? `Buque: ${event?.vesselName || ''}${event?.voyageFlightNo ? ` - Viaje ${event.voyageFlightNo}` : ''}`.trim()
                : null;

              return (
                <div key={`${event?.eventCode || 'ev'}-${idx}`} className="flex items-start gap-3 px-5 py-4">
                  <div className="mt-0.5">{getDsvIcon(event)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{label}</p>
                    {locationText && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{locationText}</p>
                    )}
                    {seaInfo && (
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{seaInfo}</p>
                    )}
                  </div>
                  {eventDate && (
                    <div className="text-right text-[10px] font-bold text-slate-400 whitespace-nowrap">{eventDate}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setCargoOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalle de la carga</span>
            {cargoOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {cargoOpen && (
            <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {raw?.goods?.description && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Descripcion: <span className="text-slate-800 font-black">{raw.goods.description}</span></div>
              )}
              {(raw?.goods?.quantityValue && raw?.goods?.quantityUom) && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Cantidad: <span className="text-slate-800 font-black">{raw.goods.quantityValue} {raw.goods.quantityUom}</span></div>
              )}
              {(raw?.goods?.grossWeightValue && raw?.goods?.grossWeightUom) && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Peso bruto: <span className="text-slate-800 font-black">{raw.goods.grossWeightValue} {raw.goods.grossWeightUom}</span></div>
              )}
              {(raw?.goods?.volumeValue && raw?.goods?.volumeUom) && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Volumen: <span className="text-slate-800 font-black">{raw.goods.volumeValue} {raw.goods.volumeUom}</span></div>
              )}
              {raw?.packages?.[0]?.packageType && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Tipo de paquete: <span className="text-slate-800 font-black">{raw.packages[0].packageType}</span></div>
              )}
              {raw?.packages?.[0]?.stackable && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Apilable: <span className="text-slate-800 font-black">{raw.packages[0].stackable}</span></div>
              )}
              {raw?.packages?.[0]?.harmonizedCodes?.[0] && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Codigo HS: <span className="text-slate-800 font-black">{raw.packages[0].harmonizedCodes[0]}</span></div>
              )}
              {typeof raw?.packages?.[0]?.isDangerous === 'boolean' && (
                <div className="text-[10px] font-bold text-slate-500 uppercase">Mercancia peligrosa: <span className="text-slate-800 font-black">{raw.packages[0].isDangerous ? 'Si' : 'No'}</span></div>
              )}
            </div>
          )}
        </div>

        {raw?.containers?.[0] && (
          <div className="bg-white rounded-3xl border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {raw.containers[0].containerNumber && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Contenedor: <span className="text-slate-800 font-black">{raw.containers[0].containerNumber}</span></div>
            )}
            {raw.containers[0].containerType && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Tipo: <span className="text-slate-800 font-black">{raw.containers[0].containerType}</span></div>
            )}
            {raw.containers[0].sealNumber && (
              <div className="text-[10px] font-bold text-slate-500 uppercase">Sello: <span className="text-slate-800 font-black">{raw.containers[0].sealNumber}</span></div>
            )}
          </div>
        )}
      </div>
    );
  }

  const raw = shipmentData.raw || {};
  const shipment = raw?.shipments?.[0];
  const events = Array.isArray(shipment?.events) ? [...shipment.events].sort((a, b) => {
    const timeA = Date.parse(a?.timestamp || '') || 0;
    const timeB = Date.parse(b?.timestamp || '') || 0;
    return timeB - timeA;
  }) : normalizedEvents;
  const status = shipment?.status;
  const statusCode = status?.statusCode || status?.status;
  const statusLabel = getStatusLabel(statusCode, 'DHL');
  const trackingId = shipment?.id || shipmentData.trackingNumber || null;
  const origin = shipment?.origin?.address?.addressLocality;
  const destination = shipment?.destination?.address?.addressLocality;
  const lastUpdate = formatTrackingDate(status?.timestamp || latestEvent?.timestamp);
  const productName = shipment?.details?.product?.productName;
  const totalPieces = shipment?.details?.totalNumberOfPieces;
  const proofUrl = shipment?.details?.proofOfDelivery?.documentUrl;

  return (
    <div className="mt-6 space-y-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tracking DHL</p>
            {trackingId && (
              <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{trackingId}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {getDhlHeaderIcon(statusCode)}
              <p className="text-[11px] font-bold text-emerald-600 uppercase">{statusLabel}</p>
            </div>
            {latestEvent && (
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                Ultimo estado: {getStatusLabel(latestEvent.status || latestEvent.statusCode, 'DHL')}
              </p>
            )}
          </div>
          <div className="text-right">
            {(origin || destination) && (
              <p className="text-[11px] font-black text-slate-700 uppercase">{origin}{' -> '}{destination}</p>
            )}
            {lastUpdate && (
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ultima actualizacion: {lastUpdate}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {productName && (
            <div className="text-[10px] font-bold text-slate-500 uppercase">Servicio: <span className="text-slate-800 font-black">{productName}</span></div>
          )}
          {typeof totalPieces === 'number' && (
            <div className="text-[10px] font-bold text-slate-500 uppercase">Piezas: <span className="text-slate-800 font-black">{totalPieces}</span></div>
          )}
          {shipment?.details?.shipper?.address?.countryCode && (
            <div className="text-[10px] font-bold text-slate-500 uppercase">Origen: <span className="text-slate-800 font-black">{shipment.details.shipper.address.countryCode}</span></div>
          )}
          {shipment?.details?.consignee?.address?.countryCode && (
            <div className="text-[10px] font-bold text-slate-500 uppercase">Destino: <span className="text-slate-800 font-black">{shipment.details.consignee.address.countryCode}</span></div>
          )}
          {proofUrl && (
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              POD: <a href={proofUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-black">Ver comprobante</a>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eventos del envio</p>
          {events.length > 1 && (
            <button
              type="button"
              onClick={() => setTimelineOpen((prev) => !prev)}
              className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"
            >
              {timelineOpen ? <><ChevronUp size={12} /> Ocultar historial</> : <><ChevronDown size={12} /> Ver historial</>}
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-50">
          {(timelineOpen ? events : events.slice(0, 1)).map((event, idx) => {
            const code = event?.status || event?.statusCode;
            const label = getStatusLabel(code, 'DHL');
            const eventDate = formatTrackingDate(event?.timestamp);
            const location = event?.location?.address?.addressLocality;
            const country = event?.location?.address?.countryCode;
            const locationText = [location, country].filter(Boolean).join(' - ');

            return (
              <div key={`${code || 'ev'}-${idx}`} className="flex items-start gap-3 px-5 py-4">
                <div className="mt-0.5">{getDhlHeaderIcon(code)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">{label}</p>
                  {locationText && (
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{locationText}</p>
                  )}
                </div>
                {eventDate && (
                  <div className="text-right text-[10px] font-bold text-slate-400 whitespace-nowrap">{eventDate}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ShipmentTrackerCompact = ({ shipmentData }) => {
  const providerId = String(shipmentData?.provider || shipmentData?.source || '').toUpperCase();
  const isDsv = providerId === 'DSV';
  const events = Array.isArray(shipmentData?.events) ? [...shipmentData.events].sort((a, b) => {
    const timeA = Date.parse(isDsv ? getDsvNormalizedEventTimestamp(a) : a?.timestamp || '') || 0;
    const timeB = Date.parse(isDsv ? getDsvNormalizedEventTimestamp(b) : b?.timestamp || '') || 0;
    return timeB - timeA;
  }) : [];
  const latestEvent = events[0] || null;

  if (!shipmentData || !latestEvent) {
    return null;
  }

  const raw = shipmentData.raw || {};
  const shipment = raw?.shipments?.[0];
  const status = shipment?.status;
  const statusCode = status?.statusCode || status?.status || latestEvent?.status || latestEvent?.statusCode;
  const label = isDsv
    ? getDsvEventLabel(latestEvent?.raw || {})
    : getStatusLabel(statusCode, 'DHL');
  const timestamp = formatTrackingDate(status?.timestamp || latestEvent?.timestamp);
  const dsvTimestamp = formatTrackingDate(getDsvNormalizedEventTimestamp(latestEvent));
  const location = isDsv
    ? latestEvent?.raw?.location?.place
    : status?.location?.address?.addressLocality
      || latestEvent?.location?.address?.addressLocality;
  const country = isDsv
    ? latestEvent?.raw?.location?.countryCode
    : status?.location?.address?.countryCode
      || latestEvent?.location?.address?.countryCode;
  const locationText = [location, country].filter(Boolean).join(' - ');
  const orderRef = isDsv
    ? raw?.references?.find((ref) => ref?.type === 'ORDER_NUMBER' && ref?.value !== 'OC')?.value
    : null;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isDsv ? getDsvIcon(latestEvent?.raw || {}) : getDhlHeaderIcon(statusCode)}
        </div>
        <div className="min-w-0 w-full">
          <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">{label}</p>
          {locationText && (
            <p className="text-[9px] font-bold text-slate-400 mt-1">{locationText}</p>
          )}
          {(isDsv ? dsvTimestamp : timestamp) && (
            <p className="text-[9px] font-bold text-slate-400 mt-1">
              Ultima actualizacion: {isDsv ? dsvTimestamp : timestamp}
            </p>
          )}
          {orderRef && (
            <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 border-t border-slate-200/60 pt-1">
              Orden de compra: <span className="text-slate-800 font-black">{orderRef}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
