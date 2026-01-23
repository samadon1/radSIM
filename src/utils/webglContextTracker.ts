/**
 * WebGL Context Tracker
 * Monitors WebGL context creation/destruction to help debug context limit issues
 */

class WebGLContextTracker {
  private static instance: WebGLContextTracker;
  private contextsCreated = 0;
  private contextsDestroyed = 0;
  private activeContexts = new Set<string>();

  static getInstance() {
    if (!this.instance) {
      this.instance = new WebGLContextTracker();
    }
    return this.instance;
  }

  trackContextCreation(componentName: string) {
    this.contextsCreated++;
    const id = `${componentName}-${this.contextsCreated}`;
    this.activeContexts.add(id);

    console.log(`[WebGL Tracker] Context created for ${componentName}`);
    console.log(`[WebGL Tracker] Total created: ${this.contextsCreated}, Active: ${this.activeContexts.size}`);

    if (this.activeContexts.size > 10) {
      console.warn(`[WebGL Tracker] WARNING: ${this.activeContexts.size} active contexts! Browser limit is ~16.`);
    }

    return id;
  }

  trackContextDestruction(id: string) {
    if (this.activeContexts.has(id)) {
      this.activeContexts.delete(id);
      this.contextsDestroyed++;
      console.log(`[WebGL Tracker] Context destroyed: ${id}`);
      console.log(`[WebGL Tracker] Total destroyed: ${this.contextsDestroyed}, Active: ${this.activeContexts.size}`);
    }
  }

  getStats() {
    return {
      created: this.contextsCreated,
      destroyed: this.contextsDestroyed,
      active: this.activeContexts.size,
      activeIds: Array.from(this.activeContexts),
    };
  }

  logStats() {
    const stats = this.getStats();
    console.log('[WebGL Tracker] Stats:', stats);
    if (stats.active > 4) {
      console.warn(`[WebGL Tracker] Expected 4 active contexts (Quad View), but found ${stats.active}!`);
      console.warn('[WebGL Tracker] This suggests contexts are not being cleaned up properly.');
    }
  }
}

export const webglTracker = WebGLContextTracker.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).webglTracker = webglTracker;
}
