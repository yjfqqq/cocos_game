# 主界面 V03

修复 V02 所有文字挤在一起的问题。

原因：
V02 对文字节点使用了 Widget 自动对齐，但每个文字节点都没有独立的布局约束，所以全部落到了中心。

V03：
- 使用项目当前设计分辨率 1280x720
- 所有节点明确 setPosition
- 不再使用 Widget
- 使用 Graphics 绘制灰盒面板
- 结构：TopBar / FactionPanel / CoreDisplay / BottomMenu
- 底部六项：角色、神器、图鉴、背包、商店、成就

使用：
1. 替换项目 assets/scripts/main/MainUIBuilder.ts
2. 保持 UIBuilder 节点上的 MainUIBuilder 组件
3. 保存并重新运行场景
