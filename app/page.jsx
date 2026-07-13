"use client";

import { useMemo, useState } from "react";

const ROOM_TYPES = [
  { key: "SHARING", label: "Sharing", divisor: 1 },
  { key: "DOUBLE", label: "Double", divisor: 2 },
  { key: "TRIPLE", label: "Triple", divisor: 3 },
  { key: "QUAD", label: "Quad", divisor: 4 },
];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `seg-${idCounter}`;
}

function makeSegment() {
  return { id: nextId(), startDate: "", endDate: "", roomPrice: "" };
}

const SEGMENT_COLORS = [
  { border: "border-l-blue-400", dot: "bg-blue-400", label: "text-blue-600" },
  { border: "border-l-purple-400", dot: "bg-purple-400", label: "text-purple-600" },
  { border: "border-l-amber-400", dot: "bg-amber-400", label: "text-amber-600" },
  { border: "border-l-emerald-400", dot: "bg-emerald-400", label: "text-emerald-600" },
  { border: "border-l-rose-400", dot: "bg-rose-400", label: "text-rose-600" },
];

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function nightsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Per-hotel state: room type + one shared discount pair, and a list of date-range
// segments that only carry their own dates and room price.
function useHotelState(pax, riyalRate) {
  const [roomType, setRoomType] = useState("DOUBLE");
  const [roomDiscount, setRoomDiscount] = useState("");
  const [agentDiscount, setAgentDiscount] = useState("");
  const [segments, setSegments] = useState(() => [makeSegment()]);

  const divisor = ROOM_TYPES.find((r) => r.key === roomType)?.divisor ?? 1;
  const isSharing = roomType === "SHARING";

  const addSegment = () => setSegments((s) => [...s, makeSegment()]);
  const removeSegment = (id) => setSegments((s) => (s.length > 1 ? s.filter((seg) => seg.id !== id) : s));
  const updateSegment = (id, field, value) =>
    setSegments((s) => s.map((seg) => (seg.id === id ? { ...seg, [field]: value } : seg)));

  const calc = useMemo(() => {
    const p = toNumber(pax);
    const rate = toNumber(riyalRate);
    const rDisc = toNumber(roomDiscount);
    const aDisc = toNumber(agentDiscount);

    const segmentResults = segments.map((seg) => {
      const price = toNumber(seg.roomPrice);
      const nights = nightsBetween(seg.startDate, seg.endDate);

      const base = isSharing ? price : price / divisor;
      const roomDiscPerPerson = isSharing ? rDisc : rDisc / divisor;
      const afterRoomDiscount = base - roomDiscPerPerson;
      const perNight = afterRoomDiscount - aDisc;

      const totalPerPersonSAR = perNight * nights;
      const receivableSAR = totalPerPersonSAR * p;

      return { id: seg.id, nights, base, roomDiscPerPerson, afterRoomDiscount, perNight, totalPerPersonSAR, receivableSAR };
    });

    const totalNights = segmentResults.reduce((sum, r) => sum + r.nights, 0);
    const totalPerPersonSAR = segmentResults.reduce((sum, r) => sum + r.totalPerPersonSAR, 0);
    const totalReceivableSAR = segmentResults.reduce((sum, r) => sum + r.receivableSAR, 0);
    const totalReceivablePKR = totalReceivableSAR * rate;

    return { segmentResults, totalNights, totalPerPersonSAR, totalReceivableSAR, totalReceivablePKR };
  }, [segments, roomDiscount, agentDiscount, pax, riyalRate, isSharing, divisor]);

  return {
    roomType, setRoomType,
    roomDiscount, setRoomDiscount,
    agentDiscount, setAgentDiscount,
    segments, addSegment, removeSegment, updateSegment,
    divisor, isSharing, calc,
  };
}

export default function Page() {
  const [pax, setPax] = useState("1");
  const [riyalRate, setRiyalRate] = useState("75");
  const [visaPrice, setVisaPrice] = useState("");

  const makkah = useHotelState(pax, riyalRate);
  const madinah = useHotelState(pax, riyalRate);

  const visaPricePerPerson = toNumber(visaPrice);
  const paxCount = toNumber(pax);
  const rate = toNumber(riyalRate);

  const grandPerPersonSAR = makkah.calc.totalPerPersonSAR + madinah.calc.totalPerPersonSAR + visaPricePerPerson;
  const grandTotalSAR = makkah.calc.totalReceivableSAR + madinah.calc.totalReceivableSAR + visaPricePerPerson * paxCount;
  const grandPerPersonPKR = grandPerPersonSAR * rate;
  const grandTotalPKR = grandTotalSAR * rate;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Room cost calculator</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Makkah and Madinah costs, side by side, with one combined total receivable from the customer.
          </p>
        </div>

        {/* Shared inputs */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-6 flex flex-wrap gap-6 items-end">
          <div className="w-40">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Number of pax</label>
            <input
              type="number"
              inputMode="decimal"
              value={pax}
              onChange={(e) => setPax(e.target.value)}
              placeholder="1"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
            />
            <p className="text-xs text-neutral-400 mt-1">shared across both hotels</p>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Riyal rate (SAR → PKR)</label>
            <input
              type="number"
              inputMode="decimal"
              value={riyalRate}
              onChange={(e) => setRiyalRate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Visa price per person (SAR)</label>
            <input
              type="number"
              inputMode="decimal"
              value={visaPrice}
              onChange={(e) => setVisaPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
            />
            <p className="text-xs text-neutral-400 mt-1">added to per-person and total cost</p>
          </div>
        </div>

        {/* Two hotel panels side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <HotelPanel name="Makkah" state={makkah} pax={pax} />
          <HotelPanel name="Madinah" state={madinah} pax={pax} />
        </div>

        {/* Grand total */}
        <div className="bg-neutral-900 text-white rounded-xl p-6 flex flex-wrap gap-8 items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
              Grand total receivable from customer (Makkah + Madinah + Visa)
            </p>
            <p className="text-3xl font-semibold">SAR {formatMoney(grandTotalSAR)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">In PKR</p>
            <p className="text-3xl font-semibold">Rs {formatMoney(grandTotalPKR)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">Cost per person</p>
            <p className="text-xl font-semibold">SAR {formatMoney(grandPerPersonSAR)}</p>
            <p className="text-sm text-neutral-400">Rs {formatMoney(grandPerPersonPKR)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HotelPanel({ name, state, pax }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">{name}</h2>

      <label className="block text-sm font-medium text-neutral-700 mb-2">Room type</label>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {ROOM_TYPES.map((rt) => (
          <button
            key={rt.key}
            type="button"
            onClick={() => state.setRoomType(rt.key)}
            className={`rounded-lg border px-2 py-2 text-xs sm:text-sm font-medium transition-colors ${
              state.roomType === rt.key
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Shared discounts, applied to every date range below */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field
          label="My Discount(Room_Sharing)"
          value={state.roomDiscount}
          onChange={state.setRoomDiscount}
          placeholder="0.00"
          hint={state.isSharing ? "applied in full" : `applied ÷ ${state.divisor}`}
        />
        <Field
          label="Agent discount (SAR)"
          value={state.agentDiscount}
          onChange={state.setAgentDiscount}
          placeholder="0.00"
          hint="deducted as-is"
        />
      </div>

      <div className="space-y-4">
        {state.segments.map((seg, i) => {
          const result = state.calc.segmentResults[i];
          const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          return (
            <div key={seg.id} className={`rounded-lg border border-neutral-200 border-l-4 ${color.border} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-medium flex items-center gap-1.5 ${color.label}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${color.dot}`} />
                  {state.segments.length > 1 ? `Date range ${i + 1}` : "Date range"}
                </p>
                {state.segments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => state.removeSegment(seg.id)}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Start date</label>
                  <input
                    type="date"
                    value={seg.startDate}
                    onChange={(e) => state.updateSegment(seg.id, "startDate", e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">End date</label>
                  <input
                    type="date"
                    value={seg.endDate}
                    onChange={(e) => state.updateSegment(seg.id, "endDate", e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  />
                </div>
                <Field
                  label="Room price (SAR)"
                  value={seg.roomPrice}
                  onChange={(v) => state.updateSegment(seg.id, "roomPrice", v)}
                  placeholder="0.00"
                />
              </div>

              <p className="text-xs text-neutral-500 mb-3">
                Checkin 4pm, checkout 12pm —{" "}
                <span className="font-medium text-neutral-700">
                  {result.nights} night{result.nights === 1 ? "" : "s"}
                </span>
              </p>

              {/* Segment breakdown */}
              <div className="pt-3 border-t border-neutral-100">
                <div className="space-y-1.5 text-sm">
                  <Row label={state.isSharing ? "Room price" : `Room price ÷ ${state.divisor}`} value={result.base} />
                  <Row
                    label={state.isSharing ? "− My discount" : `− My discount ÷ ${state.divisor}`}
                    value={-result.roomDiscPerPerson}
                    running={result.afterRoomDiscount}
                  />
                  <Row
                    label="− Agent discount"
                    value={-toNumber(state.agentDiscount)}
                    running={result.perNight}
                  />
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-neutral-100 font-medium">
                    <span>= Per night</span>
                    <span>SAR {formatMoney(result.perNight)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={state.addSegment}
        className="mt-3 w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
      >
        + Add another date range
      </button>

      {/* Hotel total */}
      <div className="mt-4 bg-neutral-50 rounded-lg p-4">
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">{name} total receivable</p>
        <p className="text-xl font-semibold">SAR {formatMoney(state.calc.totalReceivableSAR)}</p>
        <p className="text-sm text-neutral-500">Rs {formatMoney(state.calc.totalReceivablePKR)}</p>
        <p className="text-xs text-neutral-400 mt-2">
          {toNumber(pax) || 0} pax × {state.calc.totalNights} total night{state.calc.totalNights === 1 ? "" : "s"}
          {state.segments.length > 1 ? ` across ${state.segments.length} date ranges` : ""}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
      />
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}

function Row({ label, value, running }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span>
      <span className="tabular-nums">
        {value >= 0 ? "" : "− "}
        {formatMoney(Math.abs(value))}
        {running !== undefined && <span className="text-neutral-400"> → {formatMoney(running)}</span>}
      </span>
    </div>
  );
}
