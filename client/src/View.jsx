import './App.css';
import React from 'react';

/* everything that is rendered onto the screen is below */
class View extends React.Component {
    constructor(props) {
        super(props);
        this.i = 0;
    }
    render() {
        switch (this.props.type){
            case 'Tracks':
                return (
                    <p>
                        {this.props.arr.map(item => (
                        <div>
                            <h1>Track {++this.i}</h1>
                            <h2>{item[0]}</h2>
                            <h2>{item[1]}</h2>
                            <h2>{item[2]}</h2>
                            <button onClick={this.props.onClick}>Add To Queue: {this.i}</button>
                            <hr></hr>
                        </div>
                        ))}
                    </p>
                  );
            default:
                return(<p>Nade</p>);
        }
    }
}

export default View;
