import React, { useRef, useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useFrappeFileUpload } from "frappe-react-sdk";

function getFileExtension(path: string) {
  return path.split(".").pop()?.toLowerCase() || "";
}
function getFileName(path: string) {
  if (!path) return "";
  return path.split("/").pop() || path;
}

const pdfIcon = "/icons/pdf.svg"; 
const docIcon = "/icons/doc.svg";
const genericIcon = "/icons/file.svg";

function getFileTypeIcon(ext: string) {
  if (["pdf"].includes(ext)) return pdfIcon;
  if (["doc", "docx"].includes(ext)) return docIcon;
  return genericIcon;
}

interface FileUploadProps {
  name: string;
  label?: string;
  required?: boolean;
  maxSizeInMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const DEFAULT_ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];

const FileUpload: React.FC<FileUploadProps> = ({
  name,
  label,
  required = false,
  maxSizeInMB = 5,
  acceptedTypes = DEFAULT_ACCEPTED,
  disabled = false,
}) => {
  const { control, setValue, formState, watch } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filePath = watch(name);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { upload } = useFrappeFileUpload();

  useEffect(() => {
    setPreview(filePath || null);
  }, [filePath]);

  const isImage = (filePath?: string) => {
    if (!filePath) return false;
    const ext = getFileExtension(filePath);
    return ["png", "jpg", "jpeg", "webp"].includes(ext);
  };

  const isPDF = (filePath?: string) => {
    if (!filePath) return false;
    const ext = getFileExtension(filePath);
    return ext === "pdf";
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    const sizeInMB = file.size / 1024 / 1024;
    if (sizeInMB > maxSizeInMB) {
      alert(`File size exceeds ${maxSizeInMB} MB`);
      return;
    }
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Allowed: ${acceptedTypes.join(", ")}`);
      return;
    }
    setUploading(true);
    try {
      const res = await upload(file, { isPrivate: false });
      const fileUrl = res?.file_url;
      setPreview(fileUrl);
      setValue(name, fileUrl, { shouldValidate: true });
    } catch (err: any) {
      console.error("Upload failed", err);
      alert("Upload failed: " + err.message);
      setPreview(null);
      setValue(name, "", { shouldValidate: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setUploading(false);
  };
  const handleToggle = () => {
    if (preview) {
      setPreview(null);
      setValue(name, "", { shouldValidate: true });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      fileInputRef.current?.click();
    }
  };

  const acceptString = acceptedTypes.join(",");

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: required ? "This field is required" : false }}
      render={() => (
        <div className="flex flex-col space-y-2">
          {label && (
            <label className="block text-sm font-medium text-foreground mb-1">
              {label}
              { required ? (
                <span className="text-destructive font-medium text-sm">&nbsp;*</span>
              ) : null}
            </label>
          )}
          <div className="relative flex items-center w-full gap-3 border rounded-lg px-3 py-2 bg-gray-50 hover:border-blue-400 transition-all duration-200">
            <div className="h-10 w-10 flex items-center justify-center border rounded-md bg-white shadow">
              {preview && isImage(preview) ? (
                <img
                  src={preview.startsWith("http") ? preview : `${(window as any).frappe?.boot?.app.base_url || ""}${preview}`}
                  alt="Preview"
                  className="h-10 w-10 object-cover rounded-md"
                />
              ) : preview && isPDF(preview) ? (
                <img src={pdfIcon} alt="PDF" width={32} height={32} />
              ) : preview ? (
                <img
                  src={getFileTypeIcon(getFileExtension(preview))}
                  alt="File"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="text-gray-400 text-xs">No file</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-700 truncate">
                {filePath ? getFileName(filePath) : "No file selected"}
              </div>
              <div className="text-xs text-gray-500">
                {acceptedTypes.join(", ")} | Max {maxSizeInMB}MB
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={disabled || uploading}
              className={`px-3 py-1 rounded font-semibold transition-all duration-200 text-sm ${
                preview
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {uploading ? "Uploading..." : preview ? "Clear" : "Upload"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              accept={acceptString}
              disabled={disabled}
            />
          </div>
          {formState.errors[name] && (
            <p className="text-destructive text-sm mt-1">
              {formState.errors[name]?.message as string}
            </p>
          )}
        </div>
      )}
    />
  );
};
export default FileUpload;









