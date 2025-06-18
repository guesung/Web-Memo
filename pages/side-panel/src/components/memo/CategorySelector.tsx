import { useCategoryQuery } from '@extension/shared/hooks';
import type { CategoryRow } from '@extension/shared/types';
import { I18n } from '@extension/shared/utils/extension';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@extension/ui';

interface CategorySelectorProps {
  commandInputRef: React.RefObject<HTMLInputElement>;
  categoryInputPosition: { top: number; left: number };
  handleInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCategorySelect: (category: CategoryRow) => void;
}

export default function CategorySelector({
  commandInputRef,
  categoryInputPosition,
  handleInputKeyDown,
  handleCategorySelect,
}: CategorySelectorProps) {
  const { categories } = useCategoryQuery();

  return (
    <div
      className="fixed z-50 w-64 rounded-md bg-white shadow-lg"
      style={{
        top: categoryInputPosition.top + 'px',
        left: categoryInputPosition.left + 'px',
      }}>
      <Command>
        <CommandInput ref={commandInputRef} placeholder={I18n.get('search_category')} onKeyDown={handleInputKeyDown} />
        <CommandList>
          <CommandEmpty>{I18n.get('no_categories_found')}</CommandEmpty>
          <CommandGroup>
            {categories?.map(category => (
              <CommandItem
                key={category.id}
                onSelect={() => handleCategorySelect(category)}
                className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#888888' }} />
                {category.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
