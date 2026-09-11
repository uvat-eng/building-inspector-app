import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { playSfx, sfxForToast } from "@/lib/sfx"

export function Toaster() {
  const { toasts } = useToast()
  const heard = useRef<string | null>(null)

  // Каждое новое уведомление озвучиваем — звук подбирается по его смыслу.
  useEffect(() => {
    const top = toasts[0]
    if (!top || top.id === heard.current) return
    heard.current = top.id
    playSfx(sfxForToast(String(top.title ?? ""), top.variant))
  }, [toasts])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}