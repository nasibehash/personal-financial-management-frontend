import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api-client';
import { describeError } from '../../core/errors';
import { Lookups } from '../../core/lookups';
import { Category, CategoryType } from '../../core/models';
import { ConfirmService } from '../../shared/confirm';
import { PageHeader } from '../../shared/page-header';
import { resourceValue } from '../../core/resource-value';
import { EmptyState, ErrorBlock, Loading } from '../../shared/state-views';
import { ToastService } from '../../shared/toast';

@Component({
  selector: 'app-categories-page',
  imports: [PageHeader, Loading, ErrorBlock, EmptyState],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
})
export class CategoriesPage {
  private readonly api = inject(ApiClient);
  private readonly lookups = inject(Lookups);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly categories = rxResource({
    stream: () => this.api.categories(),
    defaultValue: [] as Category[],
  });

  private readonly list = computed(() => resourceValue(this.categories, [] as Category[]));

  protected readonly sections = computed(() => [
    {
      type: 'Expense' as CategoryType,
      title: 'دسته‌های هزینه',
      items: this.list().filter((c) => c.type === 'Expense'),
    },
    {
      type: 'Income' as CategoryType,
      title: 'دسته‌های درآمد',
      items: this.list().filter((c) => c.type === 'Income'),
    },
  ]);

  protected readonly loadError = computed(() =>
    this.categories.error() ? describeError(this.categories.error()) : null,
  );

  protected readonly newNames = signal<Record<CategoryType, string>>({ Expense: '', Income: '' });
  protected readonly editingId = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly busy = signal(false);

  protected onNewName(type: CategoryType, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newNames.update((names) => ({ ...names, [type]: value }));
  }

  protected onEditName(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  protected async add(event: Event, type: CategoryType): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const name = this.newNames()[type].trim();
    if (!name || this.busy()) {
      return;
    }

    await this.run(async () => {
      await firstValueFrom(this.api.createCategory(name, type));
      this.newNames.update((names) => ({ ...names, [type]: '' }));
      form.reset();
      this.toast.success('دسته‌بندی اضافه شد.');
    });
  }

  protected startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.editName.set(category.name);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected async saveEdit(event: Event, category: Category): Promise<void> {
    event.preventDefault();
    const name = this.editName().trim();
    if (!name || this.busy()) {
      return;
    }
    if (name === category.name) {
      this.cancelEdit();
      return;
    }

    await this.run(async () => {
      await firstValueFrom(this.api.renameCategory(category.id, name));
      this.editingId.set(null);
      this.toast.success('نام دسته‌بندی تغییر کرد.');
    });
  }

  protected async remove(category: Category): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'حذف دسته‌بندی',
      message: `دسته «${category.name}» حذف شود؟ دسته‌ای که تراکنش دارد قابل حذف نیست.`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    await this.run(async () => {
      await firstValueFrom(this.api.deleteCategory(category.id));
      this.toast.success('دسته‌بندی حذف شد.');
    });
  }

  /** Runs a change, reloads the lists afterwards and reports failures as a toast. */
  private async run(change: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await change();
      this.categories.reload();
      this.lookups.refresh();
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
