// --- 视觉效果配置 ---
export const VISUAL_CONFIG = {
    planetColor: 0xFF8800, // 星球颜色 (橙色)
    ringColor: 0xFFFFFF,   // 星环颜色 (白色)
    planetRadius: 15,      // 星球半径
    minDistance: 30,       // 最近距离
    maxDistance: 200,      // 最远距离 (虽然没硬限制，但作为参考)
    particles: {
        planet: 6000,      // 星球粒子数
        rings: 4000        // 星环粒子数
    }
};

// --- 交互灵敏度配置 (请调节此处参数) ---
export const SENSITIVITY = {
    // 1. 旋转控制
    // 旋转平滑度 (0.01 - 0.1): 数值越小，惯性越大，越平滑；数值越大，响应越快但越抖动
    // 建议值: 0.02 (液压阻尼感)
    rotationSmoothing: 0.02, 

    // 旋转灵敏度: 手部旋转角度映射到星球旋转的倍率
    // 负数表示反向(自然直觉)，绝对值越大旋转越快
    // 建议值: -1.5
    rotationMultiplier: -1.5,

    // 2. 缩放控制 (物理手感)
    // 握拳拉远时的加速度 (0.01 - 0.2)
    // 数值越大，握拳时“飞离”得越快
    zoomOutAcceleration: 0.2,

    // 张手靠近时的速度系数 (0.01 - 0.1)
    // 这是一个比例系数，距离越远速度越快。数值越大，靠近得越激进
    zoomInFactor: 0.05,

    // 停止操作时的摩擦力 (0.8 - 0.99)
    // 数值越小，停止得越快；数值越大，滑行越久
    friction: 0.8
};

// --- 手势识别阈值配置 (调节判定严格程度) ---
export const GESTURE_CONFIG = {
    // 握拳判定严格度 (1.0 - 2.0)
    // 比较 指尖到手腕距离 vs 指关节到手腕距离
    // 只有当 Tip距离 < PIP距离 * curlSensitivity 时才算卷曲
    // 数值越小，要求卷曲得越紧；数值越大，越容易判定为卷曲
    curlSensitivity: 1.0, 

    // 张开判定严格度 (0.1 - 0.3)
    // 拇指指尖需距离食指根部多远才算张开
    thumbOpenThreshold: 0.15,

    // 状态触发门槛
    // 必须有多少根手指卷曲才算握拳 (建议 4 或 5)
    fistFingerCount: 4,
    
    // 必须有多少根手指伸直才算张开 (建议 5)
    openFingerCount: 5,
    
    // 嘴巴圆形判断阈值 (宽高比 = 高度 / 宽度)
    // 只要嘴巴稍微嘟起，比率通常会超过 0.25
    mouthRoundnessThreshold: 0.25,
    
    // 嘴巴张开程度 (绝对值，0-1)
    // 设为极小值，意味着只要不是紧闭嘴唇，嘟嘴都能触发
    mouthOpenThreshold: 0.02
};

