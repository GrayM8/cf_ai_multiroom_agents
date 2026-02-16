import { Route, Switch } from "wouter";
import { Splash } from "./Splash";
import { RoomView } from "./RoomView";

export default function App() {
  return (
    <Switch>
      <Route path="/r/:roomId">
        {(params) => <RoomView roomId={params.roomId} />}
      </Route>
      <Route path="/">
        <Splash />
      </Route>
    </Switch>
  );
}
