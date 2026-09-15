//
//  FitTogetherWidgetLiveActivity.swift
//  FitTogetherWidget
//
//  Created by Creative Lab1 on 9/15/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct FitTogetherWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct FitTogetherWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FitTogetherWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension FitTogetherWidgetAttributes {
    fileprivate static var preview: FitTogetherWidgetAttributes {
        FitTogetherWidgetAttributes(name: "World")
    }
}

extension FitTogetherWidgetAttributes.ContentState {
    fileprivate static var smiley: FitTogetherWidgetAttributes.ContentState {
        FitTogetherWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: FitTogetherWidgetAttributes.ContentState {
         FitTogetherWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: FitTogetherWidgetAttributes.preview) {
   FitTogetherWidgetLiveActivity()
} contentStates: {
    FitTogetherWidgetAttributes.ContentState.smiley
    FitTogetherWidgetAttributes.ContentState.starEyes
}
