import { useEffect } from 'react'
import { App } from 'antd'
import { message } from 'antd'

/**
 * Bootstraps Ant Design's static `message` API.
 *
 * Ant Design v5+ scopes `message` to the nearest `<App>` context.
 * RTK Query middleware runs outside React, so we can't use hooks there.
 * This component calls `App.useApp()` inside the `<App>` tree and injects
 * the bound `message` instance into the module-level `message` singleton,
 * making `message.error(...)` work in non-React contexts (e.g. baseQueryWithReauth).
 *
 * Place this component as a direct child of `<App>`, rendered once at startup.
 */
export function AntdMessageInitializer() {
  const { message: msg } = App.useApp()

  useEffect(() => {
    // Override antd's static message methods with the context-aware ones
    // so calls from RTK Query middleware pick up the correct theme/config.
    message.config({ maxCount: 3 })
    const origError = message.error.bind(message)

    // Patch: replace the static message.error with the hook-based one
    // so that calls from outside React use the correct App context.
    ;(message as { error: typeof msg.error }).error = msg.error
    ;(message as { warning: typeof msg.warning }).warning = msg.warning
    ;(message as { success: typeof msg.success }).success = msg.success
    ;(message as { info: typeof msg.info }).info = msg.info

    return () => {
      // Restore on unmount (shouldn't happen in practice since App is root-level)
      ;(message as { error: typeof msg.error }).error = origError
    }
  }, [msg])

  return null
}
