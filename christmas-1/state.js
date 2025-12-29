// --- 共享状态 ---

export const state = {
    // 基础状态
    isBlowing: false,
    mouthPosition: null, // {x, y} 归一化坐标
    handDetected: false,
    videoLayout: null, // {drawX, drawY, drawW, drawH}
    
    // 交互阶段
    isBuildingTree: false, // 默认关闭
    isTreeParticleMode: false, // 阶段2：粒子圣诞树 (旧)
    isLuxuryMode: false, // 阶段3：奢华翡翠圣诞树 (新)
    stage: 'summoning', 
    treeType: 'christmas', // 'christmas' | 'spoon' 
    
    // 手势状态
    isFist: false,
    isOpen: false,
    isPinching: false, // 是否捏合
    pinchCenter: null, // 捏合中心 {x, y}
    palmPosition: null, // 手掌中心 {x, y} (新增)
    wristDistance: -1, // 双手距离
    
    // 交互状态
    isDraggingStar: false, // 是否正在拖拽星星
    debugPinchDist: -1, // Debug
    
    // 视觉参数
    bgOpacity: 1.0, // 海底背景透明度
    personCurrentX: undefined, // 人像平滑移动位置
    
    // 树的数据
    treeLayerCounts: [],
    treeLayerSlots: [],
    lastBubbleTime: 0
};