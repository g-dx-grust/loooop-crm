'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Plus, UserCog, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPasswordUser,
  resetUserPassword,
  setUserStatus,
  updateUserRole,
  type CreateUserInput,
} from './actions';
import type { UserAdminRow } from './queries';

type RoleCode = 'admin' | 'field';

const ROLE_OPTIONS: { value: RoleCode; label: string; description: string }[] = [
  { value: 'admin', label: '管理者',       description: '全機能の閲覧・変更、ユーザー管理、催事マスタ編集、CSV出力。' },
  { value: 'field', label: '現場スタッフ', description: '催事フォームから自身が担当した顧客・案件のみ閲覧・編集。' },
];

const ROLE_LABEL: Record<RoleCode, string> = {
  admin: '管理者',
  field: '現場スタッフ',
};

interface Props {
  initialUsers: UserAdminRow[];
}

const emptyForm: CreateUserInput = {
  displayName: '',
  kana: '',
  email: '',
  password: '',
  roleCode: 'field',
  affiliation: '',
  userStatus: 'active',
};

export function UsersSection({ initialUsers }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<UserAdminRow | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<RoleCode>('field');
  const [resetPwUser, setResetPwUser] = useState<UserAdminRow | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');

  const [form, setForm] = useState<CreateUserInput>(emptyForm);
  const [formError, setFormError] = useState('');
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setCreateOpen(true);
  }

  function handleCreate() {
    setFormError('');
    startTransition(async () => {
      const res = await createPasswordUser(form);
      if (res.success) {
        setCreateOpen(false);
        window.location.reload();
      } else {
        setFormError(res.error ?? '作成に失敗しました');
      }
    });
  }

  function openEditRole(u: UserAdminRow) {
    setEditRoleUser(u);
    const code = u.roleCodes[0];
    setEditRoleValue((code === 'admin' ? 'admin' : 'field') as RoleCode);
  }

  function handleSaveRole() {
    if (!editRoleUser) return;
    startTransition(async () => {
      const res = await updateUserRole(editRoleUser.id, editRoleValue);
      if (res.success) {
        setEditRoleUser(null);
        window.location.reload();
      } else {
        setFormError(res.error ?? '権限の更新に失敗しました');
      }
    });
  }

  function handleToggleStatus(u: UserAdminRow) {
    const next = u.status === 'active' ? 'suspended' : 'active';
    const verb = next === 'suspended' ? '停止' : '有効化';
    if (!confirm(`「${u.displayName}」を${verb}しますか？`)) return;
    startTransition(async () => {
      const res = await setUserStatus(u.id, next);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error ?? 'ステータスの更新に失敗しました');
      }
    });
  }

  function openResetPw(u: UserAdminRow) {
    setResetPwUser(u);
    setResetPwValue('');
    setFormError('');
  }

  function handleResetPw() {
    if (!resetPwUser) return;
    if (resetPwValue.length < 8) {
      setFormError('パスワードは 8 文字以上で入力してください');
      return;
    }
    startTransition(async () => {
      const res = await resetUserPassword(resetPwUser.id, resetPwValue);
      if (res.success) {
        setResetPwUser(null);
        setResetPwValue('');
        alert('パスワードを変更しました。本人へ連絡してください。');
      } else {
        setFormError(res.error ?? '再設定に失敗しました');
      }
    });
  }

  return (
    <div id="users" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-h1 text-text-primary">ユーザーと権限</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            メール＋パスワードでログインするユーザーを発行します。初期パスワードは本人へ別経路でお知らせください。
          </p>
        </div>
        <Button onClick={openCreate} size="md" className="shrink-0 whitespace-nowrap">
          <Plus className="size-4" />
          ユーザーを追加
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 whitespace-nowrap px-4 text-left font-medium">表示名</th>
              <th className="h-9 whitespace-nowrap px-4 text-left font-medium">メールアドレス</th>
              <th className="h-9 whitespace-nowrap px-4 text-left font-medium">認証方式</th>
              <th className="h-9 whitespace-nowrap px-4 text-left font-medium">権限</th>
              <th className="h-9 whitespace-nowrap px-4 text-left font-medium">ステータス</th>
              <th className="h-9 whitespace-nowrap px-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-10 px-4 text-center text-text-tertiary">
                  ユーザーがいません
                </td>
              </tr>
            ) : (
              initialUsers.map((u) => {
                const roleCode = u.roleCodes[0] as RoleCode | undefined;
                return (
                  <tr key={u.id} className="h-10 border-b border-border last:border-b-0 hover:bg-bg-subtle">
                    <td className="whitespace-nowrap px-4 font-medium text-text-primary">{u.displayName}</td>
                    <td className="whitespace-nowrap px-4 text-text-secondary">{u.email}</td>
                    <td className="whitespace-nowrap px-4">
                      {u.authProvider === 'lark' ? (
                        <Badge tone="info">Lark SSO</Badge>
                      ) : (
                        <Badge tone="neutral">パスワード</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4">
                      {roleCode ? (
                        <span className="text-text-primary">{ROLE_LABEL[roleCode] ?? roleCode}</span>
                      ) : (
                        <span className="text-text-tertiary">未設定</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4">
                      {u.status === 'active' ? (
                        <Badge tone="success">有効</Badge>
                      ) : (
                        <Badge tone="neutral">停止</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditRole(u)} title="権限を変更">
                          <UserCog className="size-4" />
                          権限
                        </Button>
                        {u.authProvider === 'password' ? (
                          <Button variant="ghost" size="sm" onClick={() => openResetPw(u)} title="パスワード再設定">
                            <KeyRound className="size-4" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(u)} title={u.status === 'active' ? '停止する' : '有効化する'}>
                          {u.status === 'active' ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 新規ユーザー作成 (Sheet) ─────────────────────── */}
      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ユーザーを追加"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} loading={pending}>
              作成
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-user-name" required>氏名</Label>
            <Input
              id="new-user-name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="山田 太郎"
            />
          </div>
          <div>
            <Label htmlFor="new-user-kana">フリガナ</Label>
            <Input
              id="new-user-kana"
              value={form.kana ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, kana: e.target.value }))}
              placeholder="ヤマダ タロウ"
            />
          </div>
          <div>
            <Label htmlFor="new-user-email" required>メールアドレス</Label>
            <Input
              id="new-user-email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@company.jp"
            />
          </div>
          <div>
            <Label htmlFor="new-user-password" required>初期パスワード</Label>
            <Input
              id="new-user-password"
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="8 文字以上"
            />
            <p className="mt-1 text-xs text-text-tertiary">
              本人へ別経路（口頭・社内チャット）で連絡してください。
            </p>
          </div>
          <div>
            <Label htmlFor="new-user-affiliation">所属 / 会社名</Label>
            <Input
              id="new-user-affiliation"
              value={form.affiliation ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
              placeholder="例: 株式会社〇〇"
            />
          </div>
          <div>
            <Label htmlFor="new-user-role" required>権限</Label>
            <select
              id="new-user-role"
              value={form.roleCode}
              onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value as RoleCode }))}
              className="mt-1 flex h-9 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
              {ROLE_OPTIONS.find((r) => r.value === form.roleCode)?.description}
            </p>
          </div>
          <div>
            <Label htmlFor="new-user-status" required>有効 / 無効</Label>
            <select
              id="new-user-status"
              value={form.userStatus ?? 'active'}
              onChange={(e) => setForm((f) => ({ ...f, userStatus: e.target.value as 'active' | 'suspended' }))}
              className="mt-1 flex h-9 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="active">有効</option>
              <option value="suspended">無効</option>
            </select>
          </div>

          {formError ? (
            <p className="text-xs text-status-error" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </Sheet>

      {/* ── 権限変更 (Dialog) ───────────────────────────── */}
      <Dialog
        open={!!editRoleUser}
        onClose={() => setEditRoleUser(null)}
        title="権限を変更"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditRoleUser(null)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveRole} loading={pending}>
              保存
            </Button>
          </div>
        }
      >
        {editRoleUser ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{editRoleUser.displayName}</span>
              <span className="ml-2 text-xs text-text-tertiary">{editRoleUser.email}</span>
            </p>
            <div>
              <Label htmlFor="edit-role-select" required>権限</Label>
              <select
                id="edit-role-select"
                value={editRoleValue}
                onChange={(e) => setEditRoleValue(e.target.value as RoleCode)}
                className="mt-1 flex h-9 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
                {ROLE_OPTIONS.find((r) => r.value === editRoleValue)?.description}
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* ── パスワード再設定 (Dialog) ────────────────────── */}
      <Dialog
        open={!!resetPwUser}
        onClose={() => setResetPwUser(null)}
        title="パスワードを再設定"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetPwUser(null)}>
              キャンセル
            </Button>
            <Button onClick={handleResetPw} loading={pending}>
              再設定
            </Button>
          </div>
        }
      >
        {resetPwUser ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{resetPwUser.displayName}</span>
              <span className="ml-2 text-xs text-text-tertiary">{resetPwUser.email}</span>
            </p>
            <div>
              <Label htmlFor="reset-pw-input" required>新しいパスワード</Label>
              <Input
                id="reset-pw-input"
                type="text"
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
                placeholder="8 文字以上"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                変更後は別経路で本人へ通知してください。
              </p>
            </div>
            {formError ? (
              <p className="text-xs text-status-error" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
