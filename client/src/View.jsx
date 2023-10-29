import React from 'react';

class View extends React.Component {
    render() {
        let i = 0; // Initialize track number here

        switch (this.props.type) {
            case 'Tracks':
                return (
                    <p>
                        {this.props.arr.map(item => (
                            <div key={item[2]}> {/* Add a unique key to each track */}
                                <h1>Track {++i}</h1>
                                <h2>{item[0]}</h2>
                                <h2>{item[1]}</h2>
                                <button id={item[2]} onClick={this.props.onClick}>Add To Queue</button>
                                <hr></hr>
                            </div>
                        ))}
                    </p>
                );
            default:
                return (<p>No data available</p>);
        }
    }
}

export default View;