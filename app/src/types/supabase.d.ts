// Global type declarations to handle Supabase queries
// Since we don't have generated database types, we use more flexible typing

declare module '@supabase/supabase-js' {
  interface PostgrestQueryBuilder<T> {
    // Override to return any to avoid 'never' type errors
    select(columns?: string): any;
    insert(values: any): any;
    update(values: any): any;
    delete(): any;
    eq(column: string, value: any): any;
    neq(column: string, value: any): any;
    gt(column: string, value: any): any;
    gte(column: string, value: any): any;
    lt(column: string, value: any): any;
    lte(column: string, value: any): any;
    like(column: string, pattern: string): any;
    ilike(column: string, pattern: string): any;
    is(column: string, value: any): any;
    in(column: string, values: any[]): any;
    contains(column: string, value: any): any;
    containedBy(column: string, value: any): any;
    rangeGt(column: string, value: any): any;
    rangeGte(column: string, value: any): any;
    rangeLt(column: string, value: any): any;
    rangeLte(column: string, value: any): any;
    rangeAdjacent(column: string, value: any): any;
    overlaps(column: string, value: any): any;
    textSearch(column: string, query: string): any;
    match(query: Record<string, any>): any;
    not(column: string, operator: string, value: any): any;
    or(filters: string): any;
    order(column: string, options?: { ascending?: boolean }): any;
    limit(count: number): any;
    range(from: number, to: number): any;
    abortSignal(signal: AbortSignal): any;
    single(): any;
    maybeSingle(): any;
  }

  // Export RealtimeChannel type for realtime subscriptions
  export interface RealtimeChannel {
    subscribe(callback: (payload: any) => void): any;
    unsubscribe(): any;
    send(event: string, payload: any): any;
  }

  // Export createClient function
  export function createClient(url: string, key: string, options?: any): any;
}
