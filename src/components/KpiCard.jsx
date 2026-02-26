import React from "react";

export default function KpiCard({ label, value, isGrowth = false, growthVal = 0 }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-center">
      <div className="text-[12px] text-[#86868b] uppercase tracking-wide font-semibold mb-2">
        {label}
      </div>
      <div className="text-[32px] font-bold text-[#1d1d1f] leading-none">{value}</div>

      {isGrowth && growthVal !== null && (
        <div className={`text-[14px] mt-2 font-semibold ${growthVal >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
          {growthVal >= 0 ? "↑" : "↓"} {Math.abs(growthVal).toFixed(1)}% vs anterior
        </div>
      )}

      {isGrowth && growthVal === null && (
        <div className="text-[14px] mt-2 font-semibold text-[#86868b]">Sin mes anterior</div>
      )}
    </div>
  );
}