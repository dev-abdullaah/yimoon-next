// components/Icons/SearchIconMD.jsx
const SearchIconMD = ({
    className = "w-6 h-6 text-primary",
    fill = "currentColor",
    stroke = "currentColor",
    ...props
}) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 30 30"
        className={className}
        fill={fill}
        stroke={stroke}
        strokeWidth="0.3"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5 13.7376C5 8.91196 8.91196 5 13.7376 5C18.5633 5 22.4752 8.91196 22.4752 13.7376C22.4752 18.5633 18.5633 22.4752 13.7376 22.4752C8.91196 22.4752 5 18.5633 5 13.7376ZM13.7376 3C7.80739 3 3 7.80739 3 13.7376C3 19.6678 7.80739 24.4752 13.7376 24.4752C16.2072 24.4752 18.4821 23.6415 20.2961 22.2401L26.0545 28.2565C26.4359 28.6561 27.0689 28.6708 27.4684 28.2895C27.8679 27.9082 27.8827 27.2752 27.5013 26.8757L21.7589 20.876C23.4486 18.9788 24.4752 16.4781 24.4752 13.7376C24.4752 7.80739 19.6678 3 13.7376 3Z"
        />
    </svg>
);

export default SearchIconMD;