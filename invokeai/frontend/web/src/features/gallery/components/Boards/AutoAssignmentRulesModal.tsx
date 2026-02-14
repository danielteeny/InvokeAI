import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spacer,
  Switch,
  Text,
} from '@invoke-ai/ui-library';
import { useStore } from '@nanostores/react';
import { useAssertSingleton } from 'common/hooks/useAssertSingleton';
import { toast } from 'features/toast/toast';
import { atom } from 'nanostores';
import type { ChangeEvent } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiPencilSimpleBold, PiPlusBold, PiTrashSimpleBold } from 'react-icons/pi';
import type { BoardAssignmentRule, RuleCondition } from 'services/api/endpoints/boardAssignment';
import {
  useCreateBoardAssignmentRuleMutation,
  useDeleteBoardAssignmentRuleMutation,
  useGetRulesForBoardQuery,
  useUpdateBoardAssignmentRuleMutation,
} from 'services/api/endpoints/boardAssignment';
import { useBoardName } from 'services/api/hooks/useBoardName';
import { useLoRAModels, useMainModels } from 'services/api/hooks/modelsByType';
import type { BoardDTO } from 'services/api/types';

import { RuleValueHelperPicker } from './RuleValueHelperPicker';
import {
  buildLoRANameHelperOptions,
  buildModelBaseHelperOptions,
  buildModelNameHelperOptions,
  getConditionValueForSave,
  isConditionValid,
  NUMERIC_CONDITION_TYPES,
  type HelperOptionsByConditionType,
  type RuleConditionDraft,
} from './autoAssignmentRuleUtils';

export const $boardForAutoAssignment = atom<BoardDTO | null>(null);

const CONDITION_TYPES: Array<{ value: RuleCondition['condition_type']; label: string }> = [
  { value: 'model_name', label: 'Model Name' },
  { value: 'model_base', label: 'Model Base' },
  { value: 'lora_present', label: 'LoRA Present' },
  { value: 'lora_name', label: 'LoRA Name' },
  { value: 'lora_category', label: 'LoRA Category' },
  { value: 'prompt_contains', label: 'Prompt Contains' },
  { value: 'width_min', label: 'Min Width' },
  { value: 'width_max', label: 'Max Width' },
  { value: 'height_min', label: 'Min Height' },
  { value: 'height_max', label: 'Max Height' },
];

const OPERATORS: Array<{ value: RuleCondition['operator']; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'any', label: 'Any' },
];

const CONDITION_TYPE_LABEL_BY_VALUE = Object.fromEntries(
  CONDITION_TYPES.map((conditionType) => [conditionType.value, conditionType.label])
) as Record<RuleCondition['condition_type'], string>;

const OPERATOR_LABEL_BY_VALUE = Object.fromEntries(
  OPERATORS.map((operator) => [operator.value, operator.label])
) as Record<RuleCondition['operator'], string>;

const VALID_OPERATORS_BY_TYPE: Record<RuleCondition['condition_type'], RuleCondition['operator'][]> = {
  model_name: ['equals', 'contains', 'starts_with', 'ends_with'],
  model_base: ['equals'],
  lora_present: ['any'],
  lora_name: ['equals', 'contains', 'starts_with', 'ends_with'],
  lora_category: ['equals', 'contains'],
  prompt_contains: ['contains'],
  width_min: ['greater_than'],
  width_max: ['less_than'],
  height_min: ['greater_than'],
  height_max: ['less_than'],
};

type ConditionHelperSource = Extract<RuleCondition['condition_type'], 'lora_name' | 'model_name' | 'model_base'>;

type ConditionHelperConfig = {
  source: ConditionHelperSource;
  noOptionsKey: string;
  tooltipKey: string;
};

const HELPER_CONFIG_BY_CONDITION_TYPE: Partial<Record<RuleCondition['condition_type'], ConditionHelperConfig>> = {
  model_name: {
    source: 'model_name',
    noOptionsKey: 'boards.valueHelperNoModelNames',
    tooltipKey: 'boards.valueHelperModelNameTooltip',
  },
  model_base: {
    source: 'model_base',
    noOptionsKey: 'boards.valueHelperNoModelBases',
    tooltipKey: 'boards.valueHelperModelBaseTooltip',
  },
  lora_name: {
    source: 'lora_name',
    noOptionsKey: 'boards.valueHelperNoLoraNames',
    tooltipKey: 'boards.valueHelperLoraNameTooltip',
  },
};

const formatConditionForRuleCard = (condition: RuleCondition): string => {
  const conditionTypeLabel = CONDITION_TYPE_LABEL_BY_VALUE[condition.condition_type] ?? condition.condition_type;
  const operatorLabel = OPERATOR_LABEL_BY_VALUE[condition.operator] ?? condition.operator;

  if (condition.operator === 'any') {
    return `${conditionTypeLabel} ${operatorLabel}`;
  }

  const value = String(condition.value ?? '').trim();
  if (!value) {
    return `${conditionTypeLabel} ${operatorLabel}`;
  }

  return `${conditionTypeLabel} ${operatorLabel} "${value}"`;
};

interface RuleCardProps {
  rule: BoardAssignmentRule;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onDelete: (ruleId: string) => void;
  onEdit: (rule: BoardAssignmentRule) => void;
}

const RuleCard = memo(({ rule, onToggle, onDelete, onEdit }: RuleCardProps) => {
  const { t } = useTranslation();

  const handleToggle = useCallback(() => {
    onToggle(rule.rule_id, !rule.is_enabled);
  }, [onToggle, rule.rule_id, rule.is_enabled]);

  const handleDelete = useCallback(() => {
    onDelete(rule.rule_id);
  }, [onDelete, rule.rule_id]);

  const handleEdit = useCallback(() => {
    onEdit(rule);
  }, [onEdit, rule]);

  return (
    <Box borderWidth={1} borderRadius="md" p={3} bg="base.800">
      <Flex alignItems="center" gap={2} mb={2}>
        <Text fontWeight="semibold" flex={1}>
          {rule.rule_name}
        </Text>
        <Switch isChecked={rule.is_enabled} onChange={handleToggle} size="sm" />
        <IconButton
          aria-label={t('common.edit')}
          icon={<PiPencilSimpleBold />}
          size="sm"
          variant="ghost"
          onClick={handleEdit}
        />
        <IconButton
          aria-label={t('common.delete')}
          icon={<PiTrashSimpleBold />}
          size="sm"
          variant="ghost"
          colorScheme="error"
          onClick={handleDelete}
        />
      </Flex>
      <Box fontSize="sm" color="base.400">
        {rule.conditions.map((condition, idx) => (
          <Text key={idx}>
            {idx > 0 && (rule.match_all ? 'AND ' : 'OR ')}
            {formatConditionForRuleCard(condition)}
          </Text>
        ))}
      </Box>
    </Box>
  );
});
RuleCard.displayName = 'RuleCard';

interface ConditionEditorProps {
  condition: RuleConditionDraft;
  helperOptionsByConditionType: HelperOptionsByConditionType;
  isHelperLoadingByConditionType: Partial<Record<RuleCondition['condition_type'], boolean>>;
  onChange: (condition: RuleConditionDraft) => void;
  onRemove: () => void;
  showRemove: boolean;
}

const ConditionEditor = memo(
  ({
    condition,
    helperOptionsByConditionType,
    isHelperLoadingByConditionType,
    onChange,
    onRemove,
    showRemove,
  }: ConditionEditorProps) => {
    const { t } = useTranslation();

    const validOperators = useMemo(() => {
      if (!condition.condition_type) {
        return OPERATORS;
      }
      const validOps = VALID_OPERATORS_BY_TYPE[condition.condition_type] || [];
      return OPERATORS.filter((operator) => validOps.includes(operator.value));
    }, [condition.condition_type]);

    const isNumericType = condition.condition_type ? NUMERIC_CONDITION_TYPES.has(condition.condition_type) : false;
    const isAnyOperator = condition.operator === 'any';

    const helperConfig = useMemo(() => {
      if (!condition.condition_type) {
        return undefined;
      }
      return HELPER_CONFIG_BY_CONDITION_TYPE[condition.condition_type];
    }, [condition.condition_type]);

    const helperOptions = useMemo(() => {
      if (!helperConfig) {
        return [];
      }
      return helperOptionsByConditionType[helperConfig.source] ?? [];
    }, [helperConfig, helperOptionsByConditionType]);

    const helperIsLoading = helperConfig ? (isHelperLoadingByConditionType[helperConfig.source] ?? false) : false;

    const handleTypeChange = useCallback(
      (e: ChangeEvent<HTMLSelectElement>) => {
        const selectedType = e.target.value as RuleCondition['condition_type'] | '';
        if (!selectedType) {
          onChange({ ...condition, condition_type: undefined, operator: undefined, value: undefined });
          return;
        }

        const validOps = VALID_OPERATORS_BY_TYPE[selectedType] || [];
        const nextOperator = condition.operator && validOps.includes(condition.operator) ? condition.operator : validOps[0];

        onChange({
          ...condition,
          condition_type: selectedType,
          operator: nextOperator,
          value: nextOperator === 'any' ? undefined : condition.value,
        });
      },
      [condition, onChange]
    );

    const handleOperatorChange = useCallback(
      (e: ChangeEvent<HTMLSelectElement>) => {
        const selectedOperator = e.target.value as RuleCondition['operator'] | '';
        const nextOperator = selectedOperator || undefined;
        onChange({
          ...condition,
          operator: nextOperator,
          value: nextOperator === 'any' ? undefined : condition.value,
        });
      },
      [condition, onChange]
    );

    const handleValueChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        onChange({ ...condition, value: e.target.value });
      },
      [condition, onChange]
    );

    const handleHelperSelect = useCallback(
      (selectedValue: string) => {
        if (!condition.condition_type) {
          return;
        }

        const validOps = VALID_OPERATORS_BY_TYPE[condition.condition_type] || [];
        const nextOperator = condition.operator && validOps.includes(condition.operator) ? condition.operator : validOps[0];

        onChange({
          ...condition,
          operator: nextOperator,
          value: selectedValue,
        });
      },
      [condition, onChange]
    );

    return (
      <Flex gap={2} alignItems="center">
        <Select value={condition.condition_type || ''} onChange={handleTypeChange} size="sm" flex={1}>
          <option value="">{t('boards.selectConditionType')}</option>
          {CONDITION_TYPES.map((conditionType) => (
            <option key={conditionType.value} value={conditionType.value}>
              {conditionType.label}
            </option>
          ))}
        </Select>

        <Select value={condition.operator || ''} onChange={handleOperatorChange} size="sm" flex={1}>
          <option value="">{t('boards.selectOperator')}</option>
          {validOperators.map((operator) => (
            <option key={operator.value} value={operator.value}>
              {operator.label}
            </option>
          ))}
        </Select>

        {isAnyOperator ? (
          <Flex flex={1} alignItems="center" minH={8}>
            <Text fontSize="sm" color="base.500">
              {t('boards.conditionValueNotRequiredForAny')}
            </Text>
          </Flex>
        ) : (
          <Flex gap={1} alignItems="center" flex={1}>
            <Input
              type={isNumericType ? 'number' : 'text'}
              value={String(condition.value ?? '')}
              onChange={handleValueChange}
              placeholder={t('boards.conditionValue')}
              size="sm"
              flex={1}
            />
            {helperConfig && (
              <RuleValueHelperPicker
                options={helperOptions}
                onSelect={handleHelperSelect}
                noOptionsMessage={t(helperConfig.noOptionsKey)}
                tooltip={t(helperConfig.tooltipKey)}
                isLoading={helperIsLoading}
              />
            )}
          </Flex>
        )}

        {showRemove && (
          <IconButton
            aria-label={t('common.delete')}
            icon={<PiTrashSimpleBold />}
            size="sm"
            variant="ghost"
            onClick={onRemove}
          />
        )}
      </Flex>
    );
  }
);
ConditionEditor.displayName = 'ConditionEditor';

const AutoAssignmentRulesModal = () => {
  useAssertSingleton('AutoAssignmentRulesModal');
  const { t } = useTranslation();
  const board = useStore($boardForAutoAssignment);
  const boardName = useBoardName(board?.board_id ?? '');

  const [mainModels, { isLoading: isLoadingMainModels }] = useMainModels();
  const [loraModels, { isLoading: isLoadingLoRAModels }] = useLoRAModels();

  const helperOptionsByConditionType = useMemo<HelperOptionsByConditionType>(
    () => ({
      model_name: buildModelNameHelperOptions(mainModels),
      model_base: buildModelBaseHelperOptions(mainModels),
      lora_name: buildLoRANameHelperOptions(loraModels),
    }),
    [mainModels, loraModels]
  );

  const isHelperLoadingByConditionType = useMemo<Partial<Record<RuleCondition['condition_type'], boolean>>>(
    () => ({
      model_name: isLoadingMainModels,
      model_base: isLoadingMainModels,
      lora_name: isLoadingLoRAModels,
    }),
    [isLoadingMainModels, isLoadingLoRAModels]
  );

  const { data: rules = [], isLoading } = useGetRulesForBoardQuery(board?.board_id ?? '', {
    skip: !board,
  });

  const [createRule, { isLoading: isCreating }] = useCreateBoardAssignmentRuleMutation();
  const [updateRule] = useUpdateBoardAssignmentRuleMutation();
  const [deleteRule] = useDeleteBoardAssignmentRuleMutation();

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newConditions, setNewConditions] = useState<RuleConditionDraft[]>([{ case_sensitive: false }]);
  const [matchAll, setMatchAll] = useState(true);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleName, setEditRuleName] = useState('');
  const [editConditions, setEditConditions] = useState<RuleConditionDraft[]>([]);
  const [editMatchAll, setEditMatchAll] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const buildConditionsForSave = useCallback((conditions: RuleConditionDraft[]): RuleCondition[] => {
    return conditions.filter(isConditionValid).map((condition) => {
      const normalizedValue = getConditionValueForSave(condition);

      if (normalizedValue === undefined) {
        return {
          condition_type: condition.condition_type,
          operator: condition.operator,
          case_sensitive: condition.case_sensitive ?? false,
        };
      }

      return {
        condition_type: condition.condition_type,
        operator: condition.operator,
        value: normalizedValue,
        case_sensitive: condition.case_sensitive ?? false,
      };
    });
  }, []);

  const handleClose = useCallback(() => {
    $boardForAutoAssignment.set(null);
    setIsAddingRule(false);
    setNewRuleName('');
    setNewConditions([{ case_sensitive: false }]);
    setMatchAll(true);
    setEditingRuleId(null);
    setEditRuleName('');
    setEditConditions([]);
    setEditMatchAll(true);
  }, []);

  const handleToggleRule = useCallback(
    async (ruleId: string, enabled: boolean) => {
      try {
        await updateRule({ rule_id: ruleId, changes: { is_enabled: enabled } }).unwrap();
      } catch (error) {
        toast({
          status: 'error',
          title: t('boards.updateRuleError'),
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [updateRule, t]
  );

  const handleDeleteRule = useCallback(
    async (ruleId: string) => {
      if (!board) {
        return;
      }
      try {
        await deleteRule({ rule_id: ruleId, board_id: board.board_id }).unwrap();
        toast({
          status: 'success',
          title: t('boards.ruleDeleted'),
        });
      } catch (error) {
        toast({
          status: 'error',
          title: t('boards.deleteRuleError'),
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [deleteRule, t, board]
  );

  const handleEditRule = useCallback((rule: BoardAssignmentRule) => {
    setEditingRuleId(rule.rule_id);
    setEditRuleName(rule.rule_name);
    setEditConditions(rule.conditions.map((condition) => ({ ...condition })));
    setEditMatchAll(rule.match_all);
    setIsAddingRule(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRuleId(null);
    setEditRuleName('');
    setEditConditions([]);
    setEditMatchAll(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingRuleId) {
      return;
    }

    const validConditions = buildConditionsForSave(editConditions);

    if (validConditions.length === 0) {
      toast({
        status: 'error',
        title: t('boards.noValidConditions'),
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateRule({
        rule_id: editingRuleId,
        changes: {
          rule_name: editRuleName.trim(),
          conditions: validConditions,
          match_all: editMatchAll,
        },
      }).unwrap();

      toast({
        status: 'success',
        title: t('boards.ruleUpdated'),
      });
      setEditingRuleId(null);
      setEditRuleName('');
      setEditConditions([]);
      setEditMatchAll(true);
    } catch (error) {
      toast({
        status: 'error',
        title: t('boards.updateRuleError'),
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [buildConditionsForSave, editConditions, editMatchAll, editRuleName, editingRuleId, t, updateRule]);

  const handleEditConditionChange = useCallback((index: number, condition: RuleConditionDraft) => {
    setEditConditions((prev) => prev.map((current, currentIndex) => (currentIndex === index ? condition : current)));
  }, []);

  const handleEditAddCondition = useCallback(() => {
    setEditConditions((prev) => [...prev, { case_sensitive: false }]);
  }, []);

  const handleEditRemoveCondition = useCallback((index: number) => {
    setEditConditions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handleEditRuleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEditRuleName(e.target.value);
  }, []);

  const handleEditMatchAllChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEditMatchAll(e.target.checked);
  }, []);

  const handleAddCondition = useCallback(() => {
    setNewConditions((prev) => [...prev, { case_sensitive: false }]);
  }, []);

  const handleRemoveCondition = useCallback((index: number) => {
    setNewConditions((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handleConditionChange = useCallback((index: number, condition: RuleConditionDraft) => {
    setNewConditions((prev) => prev.map((current, currentIndex) => (currentIndex === index ? condition : current)));
  }, []);

  const handleCreateRule = useCallback(async () => {
    if (!board || !newRuleName.trim()) {
      return;
    }

    const validConditions = buildConditionsForSave(newConditions);

    if (validConditions.length === 0) {
      toast({
        status: 'error',
        title: t('boards.noValidConditions'),
      });
      return;
    }

    try {
      await createRule({
        rule_name: newRuleName.trim(),
        target_board_id: board.board_id,
        conditions: validConditions,
        match_all: matchAll,
        is_enabled: true,
      }).unwrap();

      toast({
        status: 'success',
        title: t('boards.ruleCreated'),
      });
      setIsAddingRule(false);
      setNewRuleName('');
      setNewConditions([{ case_sensitive: false }]);
      setMatchAll(true);
    } catch (error) {
      toast({
        status: 'error',
        title: t('boards.createRuleError'),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [board, buildConditionsForSave, createRule, matchAll, newConditions, newRuleName, t]);

  const handleCancelAdd = useCallback(() => {
    setIsAddingRule(false);
    setNewRuleName('');
    setNewConditions([{ case_sensitive: false }]);
    setMatchAll(true);
  }, []);

  const handleStartAddingRule = useCallback(() => {
    setIsAddingRule(true);
  }, []);

  const handleRuleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewRuleName(e.target.value);
  }, []);

  const handleMatchAllChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setMatchAll(e.target.checked);
  }, []);

  if (!board) {
    return null;
  }

  return (
    <Modal isOpen={Boolean(board)} onClose={handleClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {t('boards.autoAssignmentRulesFor')} &quot;{boardName}&quot;
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="base.400" mb={4}>
            {t('boards.rulesEvaluatedOnGeneration')}
          </Text>

          {isLoading ? (
            <Text>{t('common.loading')}</Text>
          ) : (
            <Flex direction="column" gap={3}>
              {rules.map((rule) =>
                editingRuleId === rule.rule_id ? (
                  <Box key={rule.rule_id} borderWidth={1} borderRadius="md" p={3} bg="base.750">
                    <Heading size="sm" mb={3}>
                      {t('boards.editRule')}
                    </Heading>
                    <Flex direction="column" gap={3}>
                      <FormControl>
                        <FormLabel>{t('boards.ruleName')}</FormLabel>
                        <Input
                          value={editRuleName}
                          onChange={handleEditRuleNameChange}
                          placeholder={t('boards.ruleNamePlaceholder')}
                        />
                      </FormControl>

                      <FormControl>
                        <Flex alignItems="center" gap={2}>
                          <FormLabel mb={0}>{t('boards.matchAllConditions')}</FormLabel>
                          <Switch isChecked={editMatchAll} onChange={handleEditMatchAllChange} />
                        </Flex>
                      </FormControl>

                      <Box>
                        <FormLabel>{t('boards.conditions')}</FormLabel>
                        <Flex direction="column" gap={2}>
                          {editConditions.map((condition, index) => (
                            <EditConditionEditorWrapper
                              key={index}
                              index={index}
                              condition={condition}
                              helperOptionsByConditionType={helperOptionsByConditionType}
                              isHelperLoadingByConditionType={isHelperLoadingByConditionType}
                              onConditionChange={handleEditConditionChange}
                              onRemoveCondition={handleEditRemoveCondition}
                              showRemove={editConditions.length > 1}
                            />
                          ))}
                        </Flex>
                        <Button
                          leftIcon={<PiPlusBold />}
                          variant="ghost"
                          size="sm"
                          onClick={handleEditAddCondition}
                          mt={2}
                        >
                          {t('boards.addCondition')}
                        </Button>
                      </Box>

                      <Flex gap={2} justifyContent="flex-end">
                        <Button variant="ghost" onClick={handleCancelEdit}>
                          {t('common.cancel')}
                        </Button>
                        <Button colorScheme="invokeBlue" onClick={handleSaveEdit} isLoading={isUpdating}>
                          {t('common.save')}
                        </Button>
                      </Flex>
                    </Flex>
                  </Box>
                ) : (
                  <RuleCard
                    key={rule.rule_id}
                    rule={rule}
                    onToggle={handleToggleRule}
                    onDelete={handleDeleteRule}
                    onEdit={handleEditRule}
                  />
                )
              )}

              {rules.length === 0 && !isAddingRule && (
                <Text color="base.500" textAlign="center" py={4}>
                  {t('boards.noRulesYet')}
                </Text>
              )}
            </Flex>
          )}

          {isAddingRule && (
            <>
              <Divider my={4} />
              <Heading size="sm" mb={3}>
                {t('boards.addRule')}
              </Heading>
              <Flex direction="column" gap={3}>
                <FormControl>
                  <FormLabel>{t('boards.ruleName')}</FormLabel>
                  <Input
                    value={newRuleName}
                    onChange={handleRuleNameChange}
                    placeholder={t('boards.ruleNamePlaceholder')}
                  />
                </FormControl>

                <FormControl>
                  <Flex alignItems="center" gap={2}>
                    <FormLabel mb={0}>{t('boards.matchAllConditions')}</FormLabel>
                    <Switch isChecked={matchAll} onChange={handleMatchAllChange} />
                  </Flex>
                </FormControl>

                <Box>
                  <FormLabel>{t('boards.conditions')}</FormLabel>
                  <Flex direction="column" gap={2}>
                    {newConditions.map((condition, index) => (
                      <ConditionEditorWrapper
                        key={index}
                        index={index}
                        condition={condition}
                        helperOptionsByConditionType={helperOptionsByConditionType}
                        isHelperLoadingByConditionType={isHelperLoadingByConditionType}
                        onConditionChange={handleConditionChange}
                        onRemoveCondition={handleRemoveCondition}
                        showRemove={newConditions.length > 1}
                      />
                    ))}
                  </Flex>
                  <Button leftIcon={<PiPlusBold />} variant="ghost" size="sm" onClick={handleAddCondition} mt={2}>
                    {t('boards.addCondition')}
                  </Button>
                </Box>

                <Flex gap={2} justifyContent="flex-end">
                  <Button variant="ghost" onClick={handleCancelAdd}>
                    {t('common.cancel')}
                  </Button>
                  <Button colorScheme="invokeBlue" onClick={handleCreateRule} isLoading={isCreating}>
                    {t('boards.createRule')}
                  </Button>
                </Flex>
              </Flex>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {!isAddingRule && (
            <Button leftIcon={<PiPlusBold />} onClick={handleStartAddingRule}>
              {t('boards.addRule')}
            </Button>
          )}
          <Spacer />
          <Button onClick={handleClose}>{t('common.close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface ConditionEditorWrapperProps {
  index: number;
  condition: RuleConditionDraft;
  helperOptionsByConditionType: HelperOptionsByConditionType;
  isHelperLoadingByConditionType: Partial<Record<RuleCondition['condition_type'], boolean>>;
  onConditionChange: (index: number, condition: RuleConditionDraft) => void;
  onRemoveCondition: (index: number) => void;
  showRemove: boolean;
}

const ConditionEditorWrapper = memo(
  ({
    index,
    condition,
    helperOptionsByConditionType,
    isHelperLoadingByConditionType,
    onConditionChange,
    onRemoveCondition,
    showRemove,
  }: ConditionEditorWrapperProps) => {
    const handleChange = useCallback(
      (nextCondition: RuleConditionDraft) => {
        onConditionChange(index, nextCondition);
      },
      [index, onConditionChange]
    );

    const handleRemove = useCallback(() => {
      onRemoveCondition(index);
    }, [index, onRemoveCondition]);

    return (
      <ConditionEditor
        condition={condition}
        helperOptionsByConditionType={helperOptionsByConditionType}
        isHelperLoadingByConditionType={isHelperLoadingByConditionType}
        onChange={handleChange}
        onRemove={handleRemove}
        showRemove={showRemove}
      />
    );
  }
);
ConditionEditorWrapper.displayName = 'ConditionEditorWrapper';

const EditConditionEditorWrapper = memo(
  ({
    index,
    condition,
    helperOptionsByConditionType,
    isHelperLoadingByConditionType,
    onConditionChange,
    onRemoveCondition,
    showRemove,
  }: ConditionEditorWrapperProps) => {
    const handleChange = useCallback(
      (nextCondition: RuleConditionDraft) => {
        onConditionChange(index, nextCondition);
      },
      [index, onConditionChange]
    );

    const handleRemove = useCallback(() => {
      onRemoveCondition(index);
    }, [index, onRemoveCondition]);

    return (
      <ConditionEditor
        condition={condition}
        helperOptionsByConditionType={helperOptionsByConditionType}
        isHelperLoadingByConditionType={isHelperLoadingByConditionType}
        onChange={handleChange}
        onRemove={handleRemove}
        showRemove={showRemove}
      />
    );
  }
);
EditConditionEditorWrapper.displayName = 'EditConditionEditorWrapper';

export default memo(AutoAssignmentRulesModal);
