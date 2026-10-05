import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Category } from '../../core/models';
import { setValue, settle, startLoading, submit } from '../../core/testing';
import { ConfirmService } from '../../shared/confirm';
import { ToastService } from '../../shared/toast';
import { CategoriesPage } from './categories-page';

const categories: Category[] = [
  { id: 'e1', name: 'خوراک', type: 'Expense' },
  { id: 'e2', name: 'حمل و نقل', type: 'Expense' },
  { id: 'i1', name: 'حقوق', type: 'Income' },
];

describe('CategoriesPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async (list: Category[] = categories) => {
    TestBed.configureTestingModule({
      imports: [CategoriesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await startLoading();
    http.expectOne((r) => r.url === '/api/categories').flush(list);
    await settle(fixture);
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  const reload = async (
    fixture: ComponentFixture<unknown>,
    http: HttpTestingController,
    list: Category[] = categories,
  ) => {
    await startLoading();
    http.expectOne((r) => r.url === '/api/categories').flush(list);
    await settle(fixture);
  };

  const sections = (element: HTMLElement) => Array.from(element.querySelectorAll('section'));
  const button = (root: Element, text: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    )!;

  it('shows expense and income categories in separate columns', async () => {
    const { element } = await setup();

    const [expense, income] = sections(element);
    expect(expense.querySelector('h2')!.textContent).toContain('هزینه');
    expect(Array.from(expense.querySelectorAll('.name')).map((n) => n.textContent)).toEqual([
      'خوراک',
      'حمل و نقل',
    ]);
    expect(Array.from(income.querySelectorAll('.name')).map((n) => n.textContent)).toEqual([
      'حقوق',
    ]);
  });

  it('adds a category of the right type and reloads', async () => {
    const { fixture, http, element } = await setup();
    const [, income] = sections(element);

    setValue(income.querySelector<HTMLInputElement>('.add input')!, '  پاداش ');
    submit(income.querySelector('.add')!);
    const post = http.expectOne('/api/categories');
    expect(post.request.body).toEqual({ name: 'پاداش', type: 'Income' });
    post.flush({ id: 'i2', name: 'پاداش', type: 'Income' });
    await settle(fixture);

    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toContain('دسته‌بندی اضافه شد.');
    await reload(fixture, http, [...categories, { id: 'i2', name: 'پاداش', type: 'Income' }]);
    expect(sections(element)[1].querySelectorAll('.name')).toHaveLength(2);
    expect(sections(element)[1].querySelector<HTMLInputElement>('.add input')!.value).toBe('');
  });

  it('does nothing for a blank name', async () => {
    const { fixture, http, element } = await setup();
    const [expense] = sections(element);

    expect(button(expense, 'افزودن').disabled).toBe(true);
    setValue(expense.querySelector<HTMLInputElement>('.add input')!, '   ');
    submit(expense.querySelector('.add')!);
    await settle(fixture);

    http.expectNone('/api/categories');
  });

  it('renames a category inline', async () => {
    const { fixture, http, element } = await setup();
    const [expense] = sections(element);

    button(expense, 'تغییر نام').click();
    await settle(fixture);
    const input = expense.querySelector<HTMLInputElement>('.edit input')!;
    expect(input.value).toBe('خوراک');
    setValue(input, 'غذا');
    submit(expense.querySelector('.edit')!);

    const put = http.expectOne('/api/categories/e1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ name: 'غذا' });
    put.flush({ id: 'e1', name: 'غذا', type: 'Expense' });
    await settle(fixture);
    await reload(fixture, http, [
      { id: 'e1', name: 'غذا', type: 'Expense' },
      ...categories.slice(1),
    ]);

    expect(expense.querySelector('.name')!.textContent).toBe('غذا');
    expect(expense.querySelector('.edit')).toBeNull();
  });

  it('closes the editor without a request when the name did not change', async () => {
    const { fixture, http, element } = await setup();
    const [expense] = sections(element);

    button(expense, 'تغییر نام').click();
    await settle(fixture);
    submit(expense.querySelector('.edit')!);
    await settle(fixture);

    http.expectNone('/api/categories/e1');
    expect(expense.querySelector('.edit')).toBeNull();
  });

  it('can cancel an edit', async () => {
    const { fixture, element } = await setup();
    const [expense] = sections(element);

    button(expense, 'تغییر نام').click();
    await settle(fixture);
    button(expense, 'انصراف').click();
    await settle(fixture);

    expect(expense.querySelector('.edit')).toBeNull();
  });

  it('deletes after confirmation and explains when a category is in use', async () => {
    const { fixture, http, element } = await setup();
    const ask = vi.spyOn(TestBed.inject(ConfirmService), 'ask');
    const [expense] = sections(element);

    ask.mockResolvedValueOnce(false);
    button(expense, 'حذف').click();
    await settle(fixture);
    http.expectNone('/api/categories/e1');

    ask.mockResolvedValueOnce(true);
    button(expense, 'حذف').click();
    await settle(fixture);
    http
      .expectOne('/api/categories/e1')
      .flush(
        { detail: 'The category is used by 3 transaction(s) and cannot be deleted.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    const toast = TestBed.inject(ToastService).toasts()[0];
    expect(toast.kind).toBe('error');
    expect(toast.message).toContain('used by 3 transaction(s)');
  });

  it('shows an empty hint for a type without categories', async () => {
    const { element } = await setup([categories[0]]);

    expect(sections(element)[1].textContent).toContain('دسته‌ای وجود ندارد');
  });
});
