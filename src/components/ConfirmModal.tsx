import { X, Check } from 'lucide-react'

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar' }: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">{title}</h3>
                <p className="text-gray-500 font-medium mb-6 text-sm">{message}</p>
                <div className="flex space-x-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors active:scale-95 text-sm flex items-center justify-center">
                        <X className="w-4 h-4 mr-2" />{cancelText}
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm active:scale-95 text-sm flex items-center justify-center">
                        <Check className="w-4 h-4 mr-2" />{confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
