import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  loading = false,
  label,
  loadingLabel,
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium 
                 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          {loadingLabel || "Loading..."}
        </div>
      ) : (
        children || label
      )}
    </button>
  );
};

export default Button;
