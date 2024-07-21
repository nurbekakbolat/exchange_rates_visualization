import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from '@nivo/line';
import './App.css';

const tickRate = {
  "1m": "every 2 days",
  "3m": "every 7 days",
  "6m": "every 14 days",
  "12m": "every 30 days",
};

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1m");

  const fetchData = (period) => {
    setLoading(true);
    axios.get(`http://localhost:8000/fetch_data?period=${period}`)
      .then(response => {
        return axios.get('http://localhost:8000/exchange_rates');
      })
      .then(response => {
        const formattedData = response.data.map(item => ({
          x: item.date.split('T')[0],
          y: item.rate,
        }));

        setData([{ id: 'EUR-USD', data: formattedData }]);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  };

  const yValues = data[0]?.data.map(d => d.y) || [];
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  useEffect(() => {
    fetchData(period);
  }, [period]);

  if (loading) {
    return  <div className="loading">Загрузка данных...</div>;
  }

  return (
    <div className="app-container">
      <select className="period-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
      <option value="1m">1 месяц</option>
        <option value="3m">Последние 3 месяца</option>
        <option value="6m">Последние 6 месяцев</option>
        <option value="12m">Последние 12 месяцев</option>
      </select>
      <div className="content-container">
        <div className="table-container">
        <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Курс к USD</th>
              </tr>
            </thead>
            <tbody>
              {data[0].data.map((item, index) => (
                <tr key={index}>
                  <td>{item.x}</td>
                  <td>{item.y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ width: '100%', height: '400px', overflowY: 'hidden' }}>
          <Line
            data={data}
            animat={false}
            curve="monotoneX"
            tooltip={({ point }) => (
              <div
                style={{
                  background: 'black',
                  padding: '5px 10px',
                  border: '1px solid #ccc',
                }}
              >
                <strong>Дата:</strong> {point.data.xFormatted}<br />
                <strong>Курс:</strong> {point.data.yFormatted}
              </div>
            )}
            enableTouchCrosshair
            useMesh
            theme={{
              axis: {
                ticks: {
                  text: {
                    fill: '#d3d3d3',
                  },
                },
                legend: {
                  text: {
                    fill: '#d3d3d3',
                  },
                },
              },
            }}
            margin={{ top: 50, right: 20, bottom: 60, left: 80 }}
            xScale={{ type: 'time', format: '%Y-%m-%d', useUTC: false, precision: 'day' }}
            xFormat="time:%Y-%m-%d"
            yScale={{ type: 'linear', min: yMin - 0.01, max: yMax + 0.01 }}
            axisBottom={{
              format: '%b %d',
              legend: 'Date',
              legendOffset: -12,
              tickValues: tickRate[period],
            }}
            axisLeft={{
              legend: 'Rate',
              legendOffset: 12,
            }}
            pointSize={0}
            pointBorderWidth={0}

            height={400}
            width={900}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
