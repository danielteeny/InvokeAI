import type { ApiTagDescription } from '..';
import { api, buildV1Url, LIST_TAG } from '..';

// Types for board assignment rules
export interface RuleCondition {
  condition_type:
    | 'model_name'
    | 'model_base'
    | 'lora_present'
    | 'lora_name'
    | 'lora_category'
    | 'prompt_contains'
    | 'width_min'
    | 'width_max'
    | 'height_min'
    | 'height_max';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'any';
  value?: string | number | boolean | null;
  case_sensitive: boolean;
}

export interface BoardAssignmentRule {
  rule_id: string;
  rule_name: string;
  target_board_id: string;
  priority: number;
  is_enabled: boolean;
  conditions: RuleCondition[];
  match_all: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardAssignmentRuleCreate {
  rule_name: string;
  target_board_id: string;
  priority?: number;
  is_enabled?: boolean;
  conditions: RuleCondition[];
  match_all?: boolean;
}

export interface BoardAssignmentRuleUpdate {
  rule_name?: string;
  target_board_id?: string;
  priority?: number;
  is_enabled?: boolean;
  conditions?: RuleCondition[];
  match_all?: boolean;
}

export interface EvaluationResult {
  matched_board_id: string | null;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
  all_matches: Array<{
    rule_id: string;
    rule_name: string;
    target_board_id: string;
    priority: number;
    condition_count?: number;
  }>;
  has_conflict: boolean;
}

export type ConflictResolutionStrategy = 'priority_based' | 'most_specific' | 'first_match' | 'manual_only';

export interface EvaluateRequest {
  metadata: Record<string, unknown>;
  strategy?: ConflictResolutionStrategy;
}

export interface ReorderRequest {
  rule_ids: string[];
}

/**
 * Builds an endpoint URL for the board assignment router
 */
export const buildBoardAssignmentUrl = (path: string = '') => buildV1Url(`board_assignment/${path}`);

export const boardAssignmentApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Board Assignment Rules Queries
     */
    listBoardAssignmentRules: build.query<Array<BoardAssignmentRule>, { enabled_only?: boolean }>({
      query: (args) => ({
        url: buildBoardAssignmentUrl('rules'),
        params: args,
      }),
      providesTags: (result) => {
        const tags: ApiTagDescription[] = [{ type: 'BoardAssignmentRule', id: LIST_TAG }, 'FetchOnReconnect'];
        if (result) {
          tags.push(...result.map(({ rule_id }) => ({ type: 'BoardAssignmentRule' as const, id: rule_id })));
        }
        return tags;
      },
    }),

    getBoardAssignmentRule: build.query<BoardAssignmentRule, string>({
      query: (rule_id) => ({
        url: buildBoardAssignmentUrl(`rules/${rule_id}`),
      }),
      providesTags: (result, error, rule_id) => [{ type: 'BoardAssignmentRule', id: rule_id }, 'FetchOnReconnect'],
    }),

    getRulesForBoard: build.query<Array<BoardAssignmentRule>, string>({
      query: (board_id) => ({
        url: buildBoardAssignmentUrl(`boards/${board_id}/rules`),
      }),
      providesTags: (result, error, board_id) => {
        const tags: ApiTagDescription[] = [
          { type: 'BoardAssignmentRule', id: `board-${board_id}` },
          'FetchOnReconnect',
        ];
        if (result) {
          tags.push(...result.map(({ rule_id }) => ({ type: 'BoardAssignmentRule' as const, id: rule_id })));
        }
        return tags;
      },
    }),

    /**
     * Board Assignment Rules Mutations
     */
    createBoardAssignmentRule: build.mutation<BoardAssignmentRule, BoardAssignmentRuleCreate>({
      query: (rule) => ({
        url: buildBoardAssignmentUrl('rules'),
        method: 'POST',
        body: rule,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'BoardAssignmentRule', id: LIST_TAG },
        { type: 'BoardAssignmentRule', id: `board-${arg.target_board_id}` },
      ],
    }),

    updateBoardAssignmentRule: build.mutation<
      BoardAssignmentRule,
      { rule_id: string; changes: BoardAssignmentRuleUpdate }
    >({
      query: ({ rule_id, changes }) => ({
        url: buildBoardAssignmentUrl(`rules/${rule_id}`),
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'BoardAssignmentRule', id: LIST_TAG },
        { type: 'BoardAssignmentRule', id: arg.rule_id },
        // Invalidate both old and new target board if changed
        ...(result ? [{ type: 'BoardAssignmentRule' as const, id: `board-${result.target_board_id}` }] : []),
      ],
    }),

    deleteBoardAssignmentRule: build.mutation<void, { rule_id: string; board_id: string }>({
      query: ({ rule_id }) => ({
        url: buildBoardAssignmentUrl(`rules/${rule_id}`),
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'BoardAssignmentRule', id: LIST_TAG },
        { type: 'BoardAssignmentRule', id: arg.rule_id },
        { type: 'BoardAssignmentRule', id: `board-${arg.board_id}` },
      ],
    }),

    reorderBoardAssignmentRules: build.mutation<Array<BoardAssignmentRule>, ReorderRequest>({
      query: (request) => ({
        url: buildBoardAssignmentUrl('rules/reorder'),
        method: 'POST',
        body: request,
      }),
      invalidatesTags: [{ type: 'BoardAssignmentRule', id: LIST_TAG }],
    }),

    /**
     * Rule Evaluation
     */
    evaluateBoardAssignmentRules: build.mutation<EvaluationResult, EvaluateRequest>({
      query: (request) => ({
        url: buildBoardAssignmentUrl('evaluate'),
        method: 'POST',
        body: request,
      }),
    }),

    evaluateSingleRule: build.mutation<boolean, { rule_id: string; metadata: Record<string, unknown> }>({
      query: ({ rule_id, metadata }) => ({
        url: buildBoardAssignmentUrl(`evaluate/${rule_id}`),
        method: 'POST',
        body: metadata,
      }),
    }),
  }),
});

export const {
  useListBoardAssignmentRulesQuery,
  useGetBoardAssignmentRuleQuery,
  useGetRulesForBoardQuery,
  useCreateBoardAssignmentRuleMutation,
  useUpdateBoardAssignmentRuleMutation,
  useDeleteBoardAssignmentRuleMutation,
  useReorderBoardAssignmentRulesMutation,
  useEvaluateBoardAssignmentRulesMutation,
  useEvaluateSingleRuleMutation,
} = boardAssignmentApi;
