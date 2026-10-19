// styles/SelectStyles.ts
import type { StylesConfig } from 'react-select';

// Base Select component styles
export const selectStyles: StylesConfig<any, boolean> = {
    container: (provided) => ({
        ...provided,
        width: '100%',
    }),
    control: (provided, state) => ({
        ...provided,
        boxShadow: 'none',
        outline: 'none',
        borderColor: state.isFocused ? 'var(--color-primary, #000000)' : 'oklch(74.12% 0 0)',
        '&:hover': {
            borderColor: 'var(--color-primary, #000000)',
        },
    }),
    menuList: (provided) => ({
        ...provided,
        borderRadius: '3px',
        paddingTop: 0,
        paddingBottom: 0,
    }),
    option: (provided, state) => ({
        ...provided,
        paddingTop: 4,
        paddingBottom: 4,
        fontSize: '14px',
        backgroundColor: state.isSelected
            ? 'var(--color-primary, #000000)'
            : state.isFocused
                ? '#ddddddff'
                : 'white',
        color: state.isSelected ? 'white' : 'black',
        cursor: 'pointer',
        ':active': {
            ...provided[':active'],
            color: 'white',
            backgroundColor: 'var(--color-primary, #000000)',
        },
    }),
};

// City-specific styles
export const citySelectStyles: StylesConfig<any, boolean> = {
    ...selectStyles,
    menuList: (provided, state) => ({
        ...provided,
        maxHeight: 260,
        borderRadius: '3px',
        paddingTop: 0,
        paddingBottom: 0,
    }),
};

// Area-specific styles
export const areaSelectStyles: StylesConfig<any, boolean> = {
    ...selectStyles,
    menuList: (provided, state) => ({
        ...provided,
        maxHeight: 180,
        borderRadius: '3px',
        paddingTop: 0,
        paddingBottom: 0,
    }),
};
