import { IconButton } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { selectLastSelectedItem } from 'features/gallery/store/gallerySelectors';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PiStarBold, PiStarFill } from 'react-icons/pi';
import { useImageDTO, useStarImagesMutation, useUnstarImagesMutation } from 'services/api/endpoints/images';

export const ToggleStarredButton = memo(() => {
  const { t } = useTranslation();
  const lastSelectedItem = useAppSelector(selectLastSelectedItem);
  const imageDTO = useImageDTO(lastSelectedItem);
  const [starImages] = useStarImagesMutation();
  const [unstarImages] = useUnstarImagesMutation();

  const toggleStarred = useCallback(() => {
    if (!imageDTO) {
      return;
    }
    if (imageDTO.starred) {
      unstarImages({ image_names: [imageDTO.image_name] });
    } else {
      starImages({ image_names: [imageDTO.image_name] });
    }
  }, [imageDTO, starImages, unstarImages]);

  if (!imageDTO) {
    return null;
  }

  return (
    <IconButton
      icon={imageDTO.starred ? <PiStarFill /> : <PiStarBold />}
      tooltip={imageDTO.starred ? t('gallery.unstarImage') : t('gallery.starImage')}
      aria-label={imageDTO.starred ? t('gallery.unstarImage') : t('gallery.starImage')}
      onClick={toggleStarred}
      variant="link"
      alignSelf="stretch"
      colorScheme={imageDTO.starred ? 'invokeYellow' : 'base'}
    />
  );
});

ToggleStarredButton.displayName = 'ToggleStarredButton';
