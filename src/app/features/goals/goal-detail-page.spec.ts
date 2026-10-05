import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { goal, setValue, settle, startLoading, submit } from '../../core/testing';
import { GoalDetailPage } from './goal-detail-page';

describe('GoalDetailPage', () => {
  beforeEach(() => localStorage.clear());

  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [GoalDetailPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GoalDetailPage);
    fixture.componentRef.setInput('id', 'g-1');
    fixture.detectChanges();
    await startLoading();
    http.expectOne('/api/goals/g-1').flush({
      goal: goal(),
      contributions: [{ id: 'c-1', amount: 250, date: '2026-02-01T12:00:00Z', note: 'حقوق' }],
    });
    await settle(fixture);
    return { fixture, http, element: fixture.nativeElement as HTMLElement };
  };

  it('shows the goal and its contributions', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('خرید ماشین');
    expect(element.textContent).toContain('حقوق');
  });

  it('adds a contribution and reloads', async () => {
    const { fixture, http, element } = await setup();

    setValue(element.querySelector<HTMLInputElement>('#c-amount')!, '100000');
    submit(element.querySelector('form')!);
    await startLoading();

    const post = http.expectOne('/api/goals/g-1/contributions');
    expect(post.request.body.amount).toBe(100000);
    post.flush(goal());
    await settle(fixture);
    http.expectOne('/api/goals/g-1').flush({ goal: goal(), contributions: [] });
  });

  it('does not send an empty contribution', async () => {
    const { element, http } = await setup();

    submit(element.querySelector('form')!);
    await startLoading();

    http.expectNone('/api/goals/g-1/contributions');
  });
});
