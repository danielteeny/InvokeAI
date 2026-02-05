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
import type { BoardDTO } from 'services/api/types';

export const $boardForAutoAssignment = atom<BoardDTO | null>(null);

const CONDITION_TYPES = [
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
] as const;

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'any', label: 'Any' },
] as const;

// Valid operators for each condition type
const VALID_OPERATORS_BY_TYPE: Record<string, string[]> = {
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

// Condition types that require numeric values
const NUMERIC_CONDITION_TYPES = ['width_min', 'width_max', 'height_min', 'height_max'];

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
            {condition.condition_type} {condition.operator} {String(condition.value ?? '')}
          </Text>
        ))}
      </Box>
    </Box>
  );
});
RuleCard.displayName = 'RuleCard';

interface ConditionEditorProps {
  condition: Partial<RuleCondition>;
  onChange: (condition: Partial<RuleCondition>) => void;
  onRemove: () => void;
  showRemove: boolean;
}

const ConditionEditor = memo(({ condition, onChange, onRemove, showRemove }: ConditionEditorProps) => {
  const { t } = useTranslation();

  // Filter operators based on selected condition type
  const validOperators = useMemo(() => {
    if (!condition.condition_type) {
      return OPERATORS;
    }
    const validOps = VALID_OPERATORS_BY_TYPE[condition.condition_type] || [];
    return OPERATORS.filter((op) => validOps.includes(op.value));
  }, [condition.condition_type]);

  const isNumericType = NUMERIC_CONDITION_TYPES.includes(condition.condition_type || '');

  const handleTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as RuleCondition['condition_type'];
      const validOps = VALID_OPERATORS_BY_TYPE[newType] || [];
      // Reset operator if current operator is invalid for new type
      const newOperator = validOps.includes(condition.operator || '')
        ? condition.operator
        : (validOps[0] as RuleCondition['operator']) || '';
      onChange({ ...condition, condition_type: newType, operator: newOperator });
    },
    [condition, onChange]
  );

  const handleOperatorChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...condition, operator: e.target.value as RuleCondition['operator'] });
    },
    [condition, onChange]
  );

  const handleValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...condition, value: e.target.value });
    },
    [condition, onChange]
  );

  return (
    <Flex gap={2} alignItems="center">
      <Select value={condition.condition_type || ''} onChange={handleTypeChange} size="sm" flex={1}>
        <option value="">{t('boards.selectConditionType')}</option>
        {CONDITION_TYPES.map((ct) => (
          <option key={ct.value} value={ct.value}>
            {ct.label}
          </option>
        ))}
      </Select>
      <Select value={condition.operator || ''} onChange={handleOperatorChange} size="sm" flex={1}>
        <option value="">{t('boards.selectOperator')}</option>
        {validOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Select>
      <Input
        type={isNumericType ? 'number' : 'text'}
        value={String(condition.value ?? '')}
        onChange={handleValueChange}
        placeholder={t('boards.conditionValue')}
        size="sm"
        flex={1}
      />
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
});
ConditionEditor.displayName = 'ConditionEditor';

const AutoAssignmentRulesModal = () => {
  useAssertSingleton('AutoAssignmentRulesModal');
  const { t } = useTranslation();
  const board = useStore($boardForAutoAssignment);
  const boardName = useBoardName(board?.board_id ?? '');

  const { data: rules = [], isLoading } = useGetRulesForBoardQuery(board?.board_id ?? '', {
    skip: !board,
  });

  const [createRule, { isLoading: isCreating }] = useCreateBoardAssignmentRuleMutation();
  const [updateRule] = useUpdateBoardAssignmentRuleMutation();
  const [deleteRule] = useDeleteBoardAssignmentRuleMutation();

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newConditions, setNewConditions] = useState<Partial<RuleCondition>[]>([{ case_sensitive: false }]);
  const [matchAll, setMatchAll] = useState(true);

  // Edit mode state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleName, setEditRuleName] = useState('');
  const [editConditions, setEditConditions] = useState<Partial<RuleCondition>[]>([]);
  const [editMatchAll, setEditMatchAll] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClose = useCallback(() => {
    $boardForAutoAssignment.set(null);
    setIsAddingRule(false);
    setNewRuleName('');
    setNewConditions([{ case_sensitive: false }]);
    setMatchAll(true);
    // Reset edit state
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
    setEditConditions(rule.conditions.map((c) => ({ ...c })));
    setEditMatchAll(rule.match_all);
    // Close add mode if open
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

    const validConditions: RuleCondition[] = editConditions
      .filter((c) => Boolean(c.condition_type) && Boolean(c.operator) && c.value !== undefined && c.value !== '')
      .map((c) => ({
        condition_type: c.condition_type!,
        operator: c.operator!,
        value: c.value,
        case_sensitive: c.case_sensitive ?? false,
      }));

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
  }, [editingRuleId, editRuleName, editConditions, editMatchAll, updateRule, t]);

  const handleEditConditionChange = useCallback((index: number, condition: Partial<RuleCondition>) => {
    setEditConditions((prev) => prev.map((c, i) => (i === index ? condition : c)));
  }, []);

  const handleEditAddCondition = useCallback(() => {
    setEditConditions((prev) => [...prev, { case_sensitive: false }]);
  }, []);

  const handleEditRemoveCondition = useCallback((index: number) => {
    setEditConditions((prev) => prev.filter((_, i) => i !== index));
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
    setNewConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConditionChange = useCallback((index: number, condition: Partial<RuleCondition>) => {
    setNewConditions((prev) => prev.map((c, i) => (i === index ? condition : c)));
  }, []);

  const handleCreateRule = useCallback(async () => {
    if (!board || !newRuleName.trim()) {
      return;
    }

    const validConditions: RuleCondition[] = newConditions
      .filter((c) => Boolean(c.condition_type) && Boolean(c.operator) && c.value !== undefined && c.value !== '')
      .map((c) => ({
        condition_type: c.condition_type!,
        operator: c.operator!,
        value: c.value,
        case_sensitive: c.case_sensitive ?? false,
      }));

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
  }, [board, newRuleName, newConditions, matchAll, createRule, t]);

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
  condition: Partial<RuleCondition>;
  onConditionChange: (index: number, condition: Partial<RuleCondition>) => void;
  onRemoveCondition: (index: number) => void;
  showRemove: boolean;
}

const ConditionEditorWrapper = memo(
  ({ index, condition, onConditionChange, onRemoveCondition, showRemove }: ConditionEditorWrapperProps) => {
    const handleChange = useCallback(
      (c: Partial<RuleCondition>) => {
        onConditionChange(index, c);
      },
      [index, onConditionChange]
    );

    const handleRemove = useCallback(() => {
      onRemoveCondition(index);
    }, [index, onRemoveCondition]);

    return (
      <ConditionEditor condition={condition} onChange={handleChange} onRemove={handleRemove} showRemove={showRemove} />
    );
  }
);
ConditionEditorWrapper.displayName = 'ConditionEditorWrapper';

// Separate wrapper for edit mode to avoid hook issues
const EditConditionEditorWrapper = memo(
  ({ index, condition, onConditionChange, onRemoveCondition, showRemove }: ConditionEditorWrapperProps) => {
    const handleChange = useCallback(
      (c: Partial<RuleCondition>) => {
        onConditionChange(index, c);
      },
      [index, onConditionChange]
    );

    const handleRemove = useCallback(() => {
      onRemoveCondition(index);
    }, [index, onRemoveCondition]);

    return (
      <ConditionEditor condition={condition} onChange={handleChange} onRemove={handleRemove} showRemove={showRemove} />
    );
  }
);
EditConditionEditorWrapper.displayName = 'EditConditionEditorWrapper';

export default memo(AutoAssignmentRulesModal);
