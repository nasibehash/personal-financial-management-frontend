import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { Lookups } from '../../core/lookups';
import { Account } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { ACCOUNT_TYPE_LABELS } from '../../shared/labels';
import { PageHeader } from '../../shared/page-header';
import { resourceValue } from '../../shared/resource-value';
import { MoneyPipe } from '../../shared/pipes';
import { EmptyState, ErrorBlock, Loading } from '../../shared/state-views';
import { ToastService } from '../../shared/toast';
import { AccountForm } from './account-form';

@Component({
  selector: 'app-accounts-page',
  imports: [PageHeader, AccountForm, MoneyPipe, Loading, ErrorBlock, EmptyState],
  templateUrl: './accounts-page.html',
  styleUrl: './accounts-page.scss',
})
export class AccountsPage {
  private readonly api = inject(ApiClient);
  private readonly lookups = inject(Lookups);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly showArchived = signal(false);

  protected readonly accounts = rxResource({
    params: () => ({ includeArchived: this.showArchived() }),
    stream: ({ params }) => this.api.accounts(params.includeArchived),
    defaultValue: [] as Account[],
  });

  protected readonly list = computed(() => resourceValue(this.accounts, [] as Account[]));

  protected readonly total = computed(() =>
    this.list()
      .filter((a) => !a.isArchived)
      .reduce((sum, a) => sum + a.balance, 0),
  );

  /** `undefined`: dialog closed, `null`: creating, an account: editing it. */
  protected readonly editing = signal<Account | null | undefined>(undefined);
  protected readonly loadError = computed(() =>
    this.accounts.error() ? describeError(this.accounts.error()) : null,
  );

  protected toggleArchived(event: Event): void {
    this.showArchived.set((event.target as HTMLInputElement).checked);
  }

  protected onSaved(): void {
    this.editing.set(undefined);
    this.refresh();
  }

  protected async toggleArchive(account: Account): Promise<void> {
    try {
      await firstValueFrom(
        this.api.updateAccount(account.id, {
          name: account.name,
          type: account.type,
          initialBalance: account.initialBalance,
          isArchived: !account.isArchived,
        }),
      );
      this.toast.success(account.isArchived ? 'حساب از بایگانی خارج شد.' : 'حساب بایگانی شد.');
      this.refresh();
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }

  protected async remove(account: Account): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'حذف حساب',
      message: `حساب «${account.name}» حذف شود؟ حسابی که تراکنش دارد قابل حذف نیست و باید بایگانی شود.`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteAccount(account.id));
      this.toast.success('حساب حذف شد.');
      this.refresh();
    } catch (error) {
      this.toast.error(describeError(error));
    }
  }

  protected refresh(): void {
    this.accounts.reload();
    this.lookups.refresh();
  }
}
