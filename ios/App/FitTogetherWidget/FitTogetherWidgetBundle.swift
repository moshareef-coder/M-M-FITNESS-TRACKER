//
//  FitTogetherWidgetBundle.swift
//  FitTogetherWidget
//
//  Created by Creative Lab1 on 9/15/26.
//

import WidgetKit
import SwiftUI

@main
struct FitTogetherWidgetBundle: WidgetBundle {
    var body: some Widget {
        FitTogetherWidget()
        FitTogetherWidgetControl()
        FitTogetherWidgetLiveActivity()
    }
}
