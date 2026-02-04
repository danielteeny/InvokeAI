import {
  Card,
  CardBody,
  CardHeader,
  CompositeNumberInput,
  CompositeSlider,
  Flex,
  Icon,
  IconButton,
  Switch,
  Text,
  Tooltip,
} from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InformationalPopover } from 'common/components/InformationalPopover/InformationalPopover';
import {
  buildSelectLoRA,
  DEFAULT_LORA_WEIGHT_CONFIG,
  loraDeleted,
  loraIsEnabledChanged,
  loraWeightChanged,
} from 'features/controlLayers/store/lorasSlice';
import type { LoRA } from 'features/controlLayers/store/types';
import { DndListDropIndicator } from 'features/dnd/DndListDropIndicator';
import { useLoRACardDnd } from 'features/lora/components/useLoRACardDnd';
import { memo, useCallback, useMemo, useRef } from 'react';
import { PiDotsSixVerticalBold, PiTrashSimpleBold } from 'react-icons/pi';
import { useGetModelConfigQuery } from 'services/api/endpoints/models';

const MARKS = [-1, 0, 1, 2];

export const LoRACard = memo((props: { id: string }) => {
  const selectLoRA = useMemo(() => buildSelectLoRA(props.id), [props.id]);
  const lora = useAppSelector(selectLoRA);

  if (!lora) {
    return null;
  }
  return <LoRAContent lora={lora} />;
});

LoRACard.displayName = 'LoRACard';

const LoRAContent = memo(({ lora }: { lora: LoRA }) => {
  const dispatch = useAppDispatch();
  const { data: loraConfig } = useGetModelConfigQuery(lora.model.key);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [dndState, isDragging] = useLoRACardDnd(cardRef, dragHandleRef, lora.id);

  const handleChange = useCallback(
    (v: number) => {
      dispatch(loraWeightChanged({ id: lora.id, weight: v }));
    },
    [dispatch, lora.id]
  );

  const handleSetLoraToggle = useCallback(() => {
    dispatch(loraIsEnabledChanged({ id: lora.id, isEnabled: !lora.isEnabled }));
  }, [dispatch, lora.id, lora.isEnabled]);

  const handleRemoveLora = useCallback(() => {
    dispatch(loraDeleted({ id: lora.id }));
  }, [dispatch, lora.id]);

  return (
    <Card ref={cardRef} variant="lora" opacity={isDragging ? 0.3 : 1} data-entity-id={lora.id} position="relative">
      <DndListDropIndicator dndState={dndState} gap="var(--invoke-space-2)" />
      <CardHeader>
        <Flex alignItems="center" justifyContent="space-between" width="100%" gap={2}>
          <Flex alignItems="center" gap={1}>
            <Flex
              ref={dragHandleRef}
              cursor="grab"
              _active={{ cursor: 'grabbing' }}
              alignItems="center"
              justifyContent="center"
              w={5}
              h={5}
              color="base.500"
              _hover={{ color: 'base.300' }}
              data-is-dragging={isDragging}
            >
              <Icon as={PiDotsSixVerticalBold} boxSize={4} />
            </Flex>
            <Tooltip label={lora.model.name ?? loraConfig?.name ?? lora.model.key} placement="top">
              <Text noOfLines={1} wordBreak="break-all" color={lora.isEnabled ? 'base.200' : 'base.500'}>
                {lora.model.name ?? loraConfig?.name ?? lora.model.key.substring(0, 8)}
              </Text>
            </Tooltip>
          </Flex>
          <Flex alignItems="center" gap={2}>
            <Switch size="sm" onChange={handleSetLoraToggle} isChecked={lora.isEnabled} />
            <IconButton
              aria-label="Remove LoRA"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLora}
              icon={<PiTrashSimpleBold />}
            />
          </Flex>
        </Flex>
      </CardHeader>
      <InformationalPopover feature="loraWeight">
        <CardBody>
          <CompositeSlider
            value={lora.weight}
            onChange={handleChange}
            min={DEFAULT_LORA_WEIGHT_CONFIG.sliderMin}
            max={DEFAULT_LORA_WEIGHT_CONFIG.sliderMax}
            step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
            fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
            marks={MARKS}
            defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
            isDisabled={!lora.isEnabled}
          />
          <CompositeNumberInput
            value={lora.weight}
            onChange={handleChange}
            min={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMin}
            max={DEFAULT_LORA_WEIGHT_CONFIG.numberInputMax}
            step={DEFAULT_LORA_WEIGHT_CONFIG.coarseStep}
            fineStep={DEFAULT_LORA_WEIGHT_CONFIG.fineStep}
            w={20}
            flexShrink={0}
            defaultValue={DEFAULT_LORA_WEIGHT_CONFIG.initial}
            isDisabled={!lora.isEnabled}
          />
        </CardBody>
      </InformationalPopover>
    </Card>
  );
});

LoRAContent.displayName = 'LoRAContent';
