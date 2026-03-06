/**
 * ==========================================================
 * RoleSelector — 角色选择器组件
 * ==========================================================
 *
 * 提供两个使用场景：
 * 1. 源角色选择（showAuto=true）— 带"自动识别"选项
 * 2. 目标角色选择（showAuto=false）— 仅展示4种角色
 *
 * 子组件：
 * - RoleCard: 单个角色卡片（图标 + 名称 + 关注维度描述）
 * - RoleConfirmBanner: Agent1 识别后的角色确认横幅（三级降级 UI）
 */
'use client';

import { Role, RoleConfig, ROLES, ROLE_MAP } from '@/lib/types';

/** RoleSelector 组件 Props */
interface RoleSelectorProps {
  label: string;
  value: Role | 'auto';
  onChange: (role: Role | 'auto') => void;
  showAuto?: boolean;
  disabled?: boolean;
  excludeRole?: Role;
}

export function RoleSelector({
  label,
  value,
  onChange,
  showAuto = false,
  disabled = false,
  excludeRole,
}: RoleSelectorProps) {
  const roles = excludeRole ? ROLES.filter(r => r.id !== excludeRole) : ROLES;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {showAuto && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('auto')}
            className={`relative flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200 ${value === 'auto'
              ? 'border-indigo-400 bg-indigo-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-lg">🔍</span>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">自动识别</div>
              <div className="text-xs text-muted-foreground truncate">AI 智能判断角色</div>
            </div>
            {value === 'auto' && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        )}
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            selected={value === role.id}
            disabled={disabled}
            onClick={() => onChange(role.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  selected,
  disabled,
  onClick,
}: {
  role: RoleConfig;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200 ${selected
        ? `${role.borderColor} ${role.bgColor} shadow-sm`
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="text-lg">{role.icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{role.label}</div>
        <div className="text-xs text-muted-foreground truncate">{role.description}</div>
      </div>
      {selected && (
        <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center ${role.id === 'product_manager' ? 'bg-blue-500' :
          role.id === 'developer' ? 'bg-emerald-500' :
            role.id === 'operations' ? 'bg-orange-500' : 'bg-purple-500'
          }`}>
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * 意图识别后的角色确认提示横幅
 *
 * 根据 confidence 值显示不同的 UI：
 * - confidence >= 0.8: 返回 null（不显示，自动确认）
 * - 0.4 <= confidence < 0.8: 显示 top-2 候选按钮 + "其他角色"按钮
 * - confidence < 0.4: 显示全部 4 种角色按钮（手动选择模式）
 */
export function RoleConfirmBanner({
  candidates,
  confidence,
  onConfirm,
  onManualSelect,
}: {
  candidates: { role: Role; confidence: number }[];
  confidence: number;
  onConfirm: (role: Role) => void;
  onManualSelect: () => void;
}) {
  if (confidence >= 0.8) return null;

  const top = candidates[0];
  const second = candidates[1];
  const topRole = ROLE_MAP[top?.role];

  if (confidence < 0.4) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
        <p className="text-amber-800 font-medium mb-2">⚠️ 无法确定发言者角色，请手动选择</p>
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => onConfirm(r.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${r.borderColor} ${r.bgColor} hover:opacity-80`}
            >
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
      <p className="text-blue-800 mb-2">
        🤔 看起来像是<strong>{topRole?.label}</strong>的表述
        {second && `，也可能是${ROLE_MAP[second.role]?.label}视角`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(top.role)}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${topRole?.borderColor} ${topRole?.bgColor} hover:opacity-80`}
        >
          ✓ 是{topRole?.label}
        </button>
        {second && (
          <button
            onClick={() => onConfirm(second.role)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${ROLE_MAP[second.role]?.borderColor} ${ROLE_MAP[second.role]?.bgColor} hover:opacity-80`}
          >
            {ROLE_MAP[second.role]?.icon} 是{ROLE_MAP[second.role]?.label}
          </button>
        )}
        <button
          onClick={onManualSelect}
          className="px-3 py-1 rounded-full text-xs border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          其他角色...
        </button>
      </div>
    </div>
  );
}
