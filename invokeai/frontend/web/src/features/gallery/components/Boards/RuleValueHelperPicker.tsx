import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import {
  Box,
  Combobox,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@invoke-ai/ui-library';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiMagicWandBold } from 'react-icons/pi';

type RuleValueHelperPickerProps = {
  options: ComboboxOption[];
  onSelect: (value: string) => void;
  tooltip: string;
  noOptionsMessage: string;
  isLoading?: boolean;
};

export const RuleValueHelperPicker = memo(
  ({ options, onSelect, tooltip, noOptionsMessage, isLoading = false }: RuleValueHelperPickerProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = useCallback(() => {
      setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
      setIsOpen(false);
    }, []);

    const handleChange = useCallback<ComboboxOnChange>(
      (selectedOption) => {
        if (!selectedOption) {
          return;
        }
        onSelect(selectedOption.value);
        setIsOpen(false);
      },
      [onSelect]
    );

    const resolveNoOptionsMessage = useCallback(() => {
      if (isLoading) {
        return t('common.loading');
      }
      return noOptionsMessage;
    }, [isLoading, noOptionsMessage, t]);

    return (
      <Popover isLazy isOpen={isOpen} onOpen={handleOpen} onClose={handleClose} placement="bottom-end">
        <PopoverTrigger>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={tooltip}
            tooltip={tooltip}
            icon={<PiMagicWandBold />}
          />
        </PopoverTrigger>
        <Portal>
          <PopoverContent minW={320}>
            <PopoverArrow />
            <PopoverBody p={2}>
              {isLoading ? (
                <Text color="base.400">{t('common.loading')}</Text>
              ) : (
                <Box>
                  <Combobox
                    autoFocus
                    defaultMenuIsOpen
                    value={null}
                    options={options}
                    onChange={handleChange}
                    noOptionsMessage={resolveNoOptionsMessage}
                    placeholder={t('boards.ruleValueHelperSearchPlaceholder')}
                    onMenuClose={handleClose}
                  />
                </Box>
              )}
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    );
  }
);

RuleValueHelperPicker.displayName = 'RuleValueHelperPicker';
