import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { describeError } from '../../core/errors';
import { ApiClient } from '../../core/api-client';
import { Goal, GoalStatus } from '../../core/models';
import { resourceValue } from '../../core/resource-value';
import { GOAL_STATUS_LABELS } from '../../shared/labels';
import { PageHeader } from '../../shared/page-header';
import { JalaliPipe, MoneyPipe } from '../../shared/pipes';
import { ProgressBar } from '../../shared/progress-bar';
import { EmptyState, ErrorBlock, Loading } from '../../shared/state-views';
import { GoalForm } from './goal-form';

const FILTERS: { value: GoalStatus | ''; label: string }[] = [
  { value: 'Active', label: GOAL_STATUS_LABELS.Active },
  { value: 'Completed', label: GOAL_STATUS_LABELS.Completed },
  { value: 'Cancelled', label: GOAL_STATUS_LABELS.Cancelled },
  { value: '', label: 'همه' },
];

@Component({
  selector: 'app-goals-page',
  imports: [
    RouterLink,
    PageHeader,
    GoalForm,
    MoneyPipe,
    JalaliPipe,
    ProgressBar,
    Loading,
    ErrorBlock,
    EmptyState,
  ],
  templateUrl: './goals-page.html',
  styleUrl: './goals-page.scss',
})
export class GoalsPage {
  private readonly api = inject(ApiClient);

  protected readonly filters = FILTERS;
  protected readonly statusLabels = GOAL_STATUS_LABELS;
  protected readonly status = signal<GoalStatus | ''>('Active');

  protected readonly goals = rxResource({
    params: () => ({ status: this.status() }),
    stream: ({ params }) => this.api.goals(params.status || undefined),
    defaultValue: [] as Goal[],
  });

  protected readonly list = computed(() => resourceValue(this.goals, [] as Goal[]));
  protected readonly loadError = computed(() =>
    this.goals.error() ? describeError(this.goals.error()) : null,
  );

  protected readonly creating = signal(false);

  protected onCreated(): void {
    this.creating.set(false);
    this.goals.reload();
  }
}
