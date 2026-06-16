declare global {
  namespace PIXI {
    interface DisplayObject {
      onPointerDown: (callback: (event: PIXI.FederatedPointerEvent) => void) => this
      onPointerUp: (callback: (event: PIXI.FederatedPointerEvent) => void) => this
      offPointerDown: (callback: (event: PIXI.FederatedPointerEvent) => void) => this
      offPointerUp: (callback: (event: PIXI.FederatedPointerEvent) => void) => this
    }
  }
}
