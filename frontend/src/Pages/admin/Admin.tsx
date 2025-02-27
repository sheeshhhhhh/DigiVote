import SideBar from "@/components/pages/admin/SideBar"
import { Route, Routes } from "react-router"
import Polls from "./Polls"
import UpdatePoll from "@/components/pages/admin/Poll/UpdatePoll"
import PollInfo from "./PollInfo"
import Parties from "./Parties"
import UpdateParties from "@/components/pages/admin/Parties/UpdateParties"
import PartiesInfo from "./PartiesInfo"
import Users from "./Users"
import UpdateUserInfo from "./UpdateStudent/UpdateUserInfo"
import Dashboard from "./Dashboard"

const Admin = () => {
    return (
        <div className="flex">
            <SideBar />
            <main className="flex-1 p-8">
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/polls" element={<Polls />} />
                    <Route path="/polls/:id" element={<PollInfo />} />
                    <Route path="/polls/update/:id" element={<UpdatePoll />} />

                    <Route path="/parties" element={<Parties />} />
                    <Route path="/parties/:id" element={<PartiesInfo />} />
                    <Route path="/parties/update/:id" element={<UpdateParties />} />

                    <Route path="/users" element={<Users />} />
                    <Route path="/user/updateUserInfo/:userId" element={<UpdateUserInfo />} />
                </Routes>
            </main>
        </div>
    )
}

export default Admin