import React, { useState } from "react";
import MainLayout from "../components/Layout/MainLayout";
import LeftSidebar from "../components/Layout/LeftSidebar";
import RightSidebar from "../components/Layout/RightSidebar";
import DebateBoard from "./DebateBoard";

export default function BoardPage() {
    const [selectedCategory, setSelectedCategory] = useState("전체");

    return (
        <MainLayout
            left={
                <LeftSidebar
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                />
            }
            content={
                <DebateBoard selectedCategory={selectedCategory} />
            }
            right={<RightSidebar />}
        />
    );
}
