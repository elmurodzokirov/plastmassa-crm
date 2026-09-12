import type { Ref } from 'react';
import type { User } from '@plastmassa/shared';
import { SearchCombobox } from '@/components/shared/search-combobox';

interface UserSearchSelectProps {
  users: User[];
  /** Shown as suggestions when the field is focused but nothing has been typed yet. */
  recentUsers?: User[];
  value?: string;
  onSelect: (user: User) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onEnterNext?: () => void;
}

export function UserSearchSelect({
  users,
  recentUsers = [],
  value,
  onSelect,
  placeholder = 'Ishchini qidiring...',
  className,
  inputRef,
  onEnterNext,
}: UserSearchSelectProps) {
  return (
    <SearchCombobox
      items={users}
      recentItems={recentUsers}
      value={value}
      getId={(u) => u._id}
      getLabel={(u) => u.fullName}
      onSelect={onSelect}
      placeholder={placeholder}
      className={className}
      inputRef={inputRef}
      onEnterNext={onEnterNext}
    />
  );
}
