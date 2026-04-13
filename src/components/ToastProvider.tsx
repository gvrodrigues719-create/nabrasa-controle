'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            containerStyle={{ top: 20 }}
            toastOptions={{
                className: 'font-semibold text-sm shadow-md border border-gray-100',
                duration: 3500
            }}
        />
    )
}
