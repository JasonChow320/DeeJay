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
            case 'Albums':
                return (
                    <p>
                        <h1>Albums</h1>
                      {this.props.arr.map(item => (
                        <div>
                            <h1>{item[0]}</h1>
                            <h1>{item[1]}</h1>
                            <img src={item[2]} alt=""></img>
                            <button onClick={this.props.onClick}>{this.i++}Hi</button>
                        </div>
                      ))}
                    </p>
                  );
            case 'Categories':
                return(
                    <div>
                    <p>
                        <h1>Categories</h1>
                      {this.props.arr.map(item => (
                          <div>
                          <h1>{item[0]}</h1>
                          <h1>{item[1]}</h1>
                          <img src={item[2]} alt=""></img>
                      </div>
                      ))}
                    </p>
                    </div>
                );
            case 'Genre':
                return(
                    <p>
                        {this.props.arr.map(item => (
                        <div>
                            <h1>{item}</h1>
                            </div>
                        
                    ))}
                    </p>
                    
                );
            case 'Playlists':
                return(
                    <p>{this.props.arr}</p>
                );
            default:
                return(<p>Nade</p>);
        }
    }
}

export default View;