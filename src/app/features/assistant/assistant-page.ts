import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header';
import { InsightsCard } from './insights-card';
import { SmartEntry } from './smart-entry';

@Component({
  selector: 'app-assistant-page',
  imports: [PageHeader, SmartEntry, InsightsCard],
  template: `
    <app-page-header
      title="دستیار هوشمند"
      subtitle="تراکنش را بگویید یا بنویسید، و نکته‌های مالی بگیرید"
    />
    <div class="stack">
      <app-smart-entry />
      <app-insights-card />
    </div>
  `,
})
export class AssistantPage {}
