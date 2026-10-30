import * as RS from '@radix-ui/react-switch'

export const Switch = (p: RS.SwitchProps) => (
  <RS.Root
    {...p}
    className="relative h-6 w-11 shrink-0 rounded-full bg-muted-foreground/40 transition-colors data-[state=checked]:bg-brand"
  >
    <RS.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-white transition-transform data-[state=checked]:translate-x-[23px]" />
  </RS.Root>
)
