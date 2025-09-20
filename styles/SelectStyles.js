// src/styles/selectStyles.js

// Base Select component styles
export const selectStyles = {
    container: (provided) => ({
        ...provided,
        width: '100%',
    }),
    control: (provided, state) => ({
        ...provided,
        boxShadow: 'none',
        outline: 'none',
        borderColor: state.isFocused ? '#CB1E2A' : 'oklch(74.12% 0 0)',
        '&:hover': {
            borderColor: '#CB1E2A',
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
            ? '#CB1E2A'
            : state.isFocused
                ? '#ddddddff'
                : 'white',
        color: state.isSelected ? 'white' : 'black',
        cursor: 'pointer',
        ':active': {
            color: 'white',
            backgroundColor: '#CB1E2A',
        },
    }),
};

// City-specific styles
export const citySelectStyles = {
    ...selectStyles,
    menuList: (provided) => ({
        ...provided,
        maxHeight: 260,
        borderRadius: '3px',
        paddingTop: 0,
        paddingBottom: 0,
    }),
};

// Area-specific styles
export const areaSelectStyles = {
    ...selectStyles,
    menuList: (provided) => ({
        ...provided,
        maxHeight: 180,
        borderRadius: '3px',
        paddingTop: 0,
        paddingBottom: 0,
    }),
};
