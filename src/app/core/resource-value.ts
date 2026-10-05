import { Resource } from '@angular/core';

/**
 * The value of a resource, or `fallback` while it has none (still loading or failed).
 * Reading `resource.value()` directly throws when the request failed, which would break the whole page.
 */
export function resourceValue<T>(resource: Resource<T>, fallback: T): T {
  return resource.hasValue() ? resource.value() : fallback;
}
