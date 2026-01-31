import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox } from '@invoke-ai/ui-library';
import { typedMemo } from 'common/util/typedMemo';
import { LORA_CATEGORY_TO_NAME } from 'features/modelManagerV2/models';
import { useCallback, useMemo } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { useListLoraCategoriesQuery } from 'services/api/endpoints/loraCategories';

// Generic type for form values that may include category
// This allows the component to work until OpenAPI schema is regenerated
type FormWithCategory = FieldValues & { category?: string | null };

type Props<T extends FormWithCategory> = {
  control: Control<T>;
};

const CategorySelect = <T extends FormWithCategory>({ control }: Props<T>) => {
  const { data: categories } = useListLoraCategoriesQuery();
  const { field } = useController({ control, name: 'category' as Path<T> });

  const options = useMemo<ComboboxOption[]>(() => {
    // Use API categories if available, otherwise fall back to local definitions
    if (categories) {
      return [
        { label: 'Uncategorized', value: '' },
        ...categories.map((cat) => ({
          label: cat.name,
          value: cat.id,
        })),
      ];
    }
    // Fallback to local category definitions
    return [
      { label: 'Uncategorized', value: '' },
      ...Object.entries(LORA_CATEGORY_TO_NAME)
        .filter(([key]) => key !== 'uncategorized')
        .map(([value, label]) => ({
          label,
          value,
        })),
    ];
  }, [categories]);

  const value = useMemo(() => options.find((o) => o.value === (field.value ?? '')), [field.value, options]);

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      // Set to null if empty string (uncategorized), otherwise set the category value
      field.onChange(v?.value || null);
    },
    [field]
  );

  return <Combobox value={value} options={options} onChange={onChange} isClearable />;
};

export default typedMemo(CategorySelect);
